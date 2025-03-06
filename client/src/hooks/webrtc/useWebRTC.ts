import { useState, useEffect, useCallback, useRef } from "react";

interface WebRTCMessage {
  action: string;
  session_id?: string;
  target?: string;
  sdp?: string;
  candidate?: string;
}

interface FileMetadata {
  type: "file-metadata";
  name: string;
  size: number;
}

export const useWebRTC = (wsUrl: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false); // socket connection flag
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);

  const [dataChannelState, setDataChannelState] = useState<{
    isReady: boolean;
    isOpen: boolean;
  }>({
    isReady: false,
    isOpen: false,
  });

  const receivingFile = useRef<{
    metadata: FileMetadata | null;
    receivedChunks: ArrayBuffer[];
    receivedSize?: number;
    totalSize: number;
  }>({
    metadata: null,
    receivedChunks: [],
    totalSize: 0,
    receivedSize: 0,
  });

  const handleIncomingMessage = useCallback(
    (event: MessageEvent) => {
      try {
        setLoading(true);
        const jsonData = JSON.parse(event.data);

        console.log("Incoming message", jsonData);

        if (jsonData.type == "file-metadata") {
          console.log("Metadata received");
          receivingFile.current = {
            metadata: jsonData,
            receivedChunks: [],
            totalSize: parseInt(jsonData.size),
            receivedSize: 0,
          };

          return;
        }
      } catch {
        // Not JSON data
        if (receivingFile.current?.metadata) {
          const receivedBuffer = event.data as ArrayBuffer;
          if (!receivedBuffer) return;

          const newReceivedSize =
            receivingFile.current.receivedSize! + receivedBuffer.byteLength;
          const newProgress = Math.floor(
            (newReceivedSize / receivingFile.current.totalSize) * 100
          );

          setTransferProgress(newProgress);
          receivingFile.current.receivedChunks.push(receivedBuffer);
          receivingFile.current.receivedSize = newReceivedSize;

          if (newReceivedSize >= receivingFile.current.totalSize) {
            setLoading(false);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [receivingFile]
  );

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],

      iceTransportPolicy: "all",
      iceCandidatePoolSize: 2,
    });

    const sentCandidates = new Set<string>();

    pc.ondatachannel = (event) => {
      console.log("Data channel received", event);
      const receivedChannel = event.channel;

      dataChannelRef.current = receivedChannel;

      receivedChannel.onopen = () => {
        console.log("Data channel opened (receiver)");
        setDataChannelState({ isReady: true, isOpen: true });
      };

      receivedChannel.onclose = () => {
        console.log("Data channel closed (receiver)");
        setDataChannelState({ isReady: false, isOpen: false });
      };

      receivedChannel.onmessage = handleIncomingMessage;
    };

    pc.onicecandidate = (event) => {
      const currentSocket = socketRef.current;
      console.log("ICE candidate", event.candidate, currentSocket);

      if (event.candidate && currentSocket && targetIdRef.current) {
        const candidateKey = `${event.candidate.candidate}:${event.candidate.sdpMid}:${event.candidate.sdpMLineIndex}`;

        console.log("Sending candidate", candidateKey);
        if (sentCandidates.has(candidateKey)) return;
        sentCandidates.add(candidateKey);
        try {
          currentSocket.send(
            JSON.stringify({
              action: "candidate",
              candidate: JSON.stringify(event.candidate),
              target: targetIdRef.current,
            })
          );
        } catch (err) {
          console.log(err);
        }
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error("ICE candidate error", event);
    };

    peerConnectionRef.current = pc;

    return pc;
  }, [handleIncomingMessage]);

  const sendFile = useCallback(
    (file: File) => {
      if (!dataChannelRef.current || !dataChannelState.isOpen) {
        console.error("Data channel is not open for sending");
        return;
      }

      const chunkSize = 16384;
      const fileReader = new FileReader();
      let offset = 0;

      dataChannelRef.current.send(
        JSON.stringify({
          type: "file-metadata",
          name: file.name,
          size: file.size,
        })
      );

      fileReader.onload = (e) => {
        if (!e.target?.result || !dataChannelRef.current) return;

        dataChannelRef.current.send(e.target.result as ArrayBuffer);
        offset += chunkSize;

        if (offset < file.size) {
          readSlice(offset);
        }
      };

      const readSlice = (offset: number) => {
        const slice = file.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
      };

      readSlice(0);
    },
    [dataChannelState]
  );

  const createSession = useCallback(() => {
    const currentSocket = socketRef.current;
    if (currentSocket && isConnected)
      currentSocket?.send(JSON.stringify({ action: "create_session" }));
  }, [isConnected]);

  const joinSession = useCallback(
    (targetSessionId: string) => {
      targetIdRef.current = targetSessionId;
      const currentSocket = socketRef.current;
      if (currentSocket && isConnected) {
        currentSocket.send(
          JSON.stringify({
            action: "join_session",
            target: targetSessionId,
          })
        );
      }
    },
    [isConnected]
  );

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      const msg: WebRTCMessage = JSON.parse(event.data);

      switch (msg.action) {
        case "session_created":
          console.log("Session created", msg);
          setSessionId(msg.session_id!);
          break;

        case "peer_joined":
          targetIdRef.current = msg.session_id!;

          const pc = createPeerConnection();
          const dataChannel = pc.createDataChannel("fileTransfer");

          dataChannelRef.current = dataChannel;

          dataChannel.onopen = () => {
            console.log("Data channel opened (sende)");
            setDataChannelState({ isReady: true, isOpen: true });
          };

          dataChannel.onclose = () => {
            console.log("Data channel closed (sender)");
            setDataChannelState({ isReady: false, isOpen: false });
          };

          dataChannel.onerror = (err) => {
            console.error(err);
          };

          dataChannel.onmessage = (event) => {
            console.log("Data channel message on sender side", event);
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          ws.send(
            JSON.stringify({
              action: "offer",
              sdp: JSON.stringify(offer),
              target: msg.session_id,
            })
          );
          break;
        case "offer":
          console.log("Received offer", msg);
          const pc2 = createPeerConnection();
          await pc2.setRemoteDescription(JSON.parse(msg.sdp!));
          const answer = await pc2.createAnswer();
          await pc2.setLocalDescription(answer);

          ws.send(
            JSON.stringify({
              action: "answer",
              sdp: JSON.stringify(answer),
              target: msg.session_id,
            })
          );
          break;
        case "answer":
          console.log("Received answer", msg);
          await peerConnectionRef.current?.setRemoteDescription(
            JSON.parse(msg.sdp!)
          );
          break;

        case "candidate":
          console.log("Received candidate", msg);
          if (!msg.candidate || !peerConnectionRef.current) return;
          const candidate = new RTCIceCandidate(JSON.parse(msg.candidate!));
          await peerConnectionRef.current.addIceCandidate(candidate);
          break;

        case "error":
          setError(msg.sdp!);
          break;
      }
    };

    socketRef.current = ws;

    return () => {
      ws.close();
      socketRef.current = null;
      targetIdRef.current = null;
      peerConnectionRef.current = null;
    };
  }, [wsUrl]);

  return {
    isConnected,
    createSession,
    sendFile,
    sessionId,
    joinSession,
    error,
    receivingFile,
    dataChannel: {
      isReady: dataChannelState.isReady,
      isOpen: dataChannelState.isOpen,
    },
    loading,
    transferProgress,
  };
};
