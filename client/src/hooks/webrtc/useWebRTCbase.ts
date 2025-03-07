import { useState, useEffect, useCallback, useRef } from "react";

export interface WebRTCMessage {
  action: string;
  session_id?: string;
  target?: string;
  sdp?: string;
  candidate?: string;
}

export interface FileMetadata {
  type: "file-metadata";
  name: string;
  size: number;
}

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
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Socket connected");
      setIsConnected(true);
    };

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
