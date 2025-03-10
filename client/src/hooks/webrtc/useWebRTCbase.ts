import { useState, useEffect, useCallback, useRef } from "react";
import { Socket, io } from "socket.io-client";

export interface WebRTCMessage {
  action: string;
  session_id?: string;
  target?: string;
  sdp?: string;
  candidate?: string;
}

interface ClientToServerEvents {
  create_session: void;
  join_session: string;
  offer: { sdp: string; target: string };
  answer: { sdp: string; target: string };
  candidate: { candidate: string; target: string };
}

interface ServerToClientEvents {
  session_created: { session_id: string };
  peer_joined: { session_id: string };
  offer: { sdp: string; target: string };
  answer: { sdp: string; target: string };
  candidate: { candidate: string; target: string };
  error: string;
}

export interface FileMetadata {
  type: "file-metadata";
  name: string;
  size: number;
  isPasswordProtected: boolean;
}

type WebSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
// base hook for WebRTC, To be used by both sender and receiver
export const useWebRTCBase = (wsUrl: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("New session id in base", sessionId);
  }, [sessionId]);

  useEffect(() => {
    const ws: WebSocket = io(wsUrl, {
      withCredentials: true,
    });

    ws.on("connect", () => {
      console.log("Socket connected");

      setIsConnected(true);
    });

    socketRef.current = ws;

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [wsUrl]);

  const createSession = useCallback(() => {
    if (!isConnected || !socketRef.current) return;

    socketRef.current.send(
      JSON.stringify({
        action: "create_session",
      })
    );
  }, [isConnected]);

  return {
    socketRef,
    isConnected,
    sessionId,
    setSessionId,
    error,
    setError,
    createSession,
  };
};
