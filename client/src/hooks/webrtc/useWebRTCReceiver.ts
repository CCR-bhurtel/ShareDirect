import { useState, useEffect, useCallback, useRef } from "react";
import { useWebRTCBase, WebRTCMessage, FileMetadata } from "./useWebRTCbase";

// Receiver-specific logic
export const useWebRTCReceiver = (wsUrl: string) => {
  const base = useWebRTCBase(wsUrl);
  const { socketRef, isConnected, setError, setSessionId } = base;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
  } | null>({
    metadata: null,
    receivedChunks: [],
    totalSize: 0,
    receivedSize: 0,
  });

  const sendDownloadRequest = useCallback(
    (password: string) => {
      if (!dataChannelRef.current || !dataChannelState.isReady) return;

      dataChannelRef.current.send(
        JSON.stringify({
          type: "send-file-request",
          password: password,
        })
      );
    },
    [dataChannelRef, dataChannelState]
  );

  const handleIncomingMessage = useCallback(
    async (event: MessageEvent) => {
      try {
        setLoading(true);
        const jsonData = JSON.parse(event.data);

        switch (jsonData.type) {
          case "download-limit-reached":
            setError("File download limit reached");
            return;
          case "file-metadata":
            console.log("Received metadata", jsonData);
            receivingFile.current = {
              metadata: jsonData,
              receivedChunks: [],
              totalSize: parseInt(jsonData.size),
              receivedSize: 0,
            };

            setMetadataLoaded(true);
            return;
          case "password-incorrect":
            setPasswordError("Incorrect password");
            return;
        }
      } catch {
        if (
          receivingFile.current?.receivedSize ==
          receivingFile.current?.totalSize
        )
          return;

        if (receivingFile.current?.metadata) {
          let receivedBuffer: ArrayBuffer;
          if (event.data instanceof Blob) {
            receivedBuffer = await event.data.arrayBuffer();
          } else {
            receivedBuffer = event.data as ArrayBuffer;
          }
          if (!receivedBuffer) return;

          console.log(receivedBuffer);
          const newReceivedSize =
            receivingFile.current.receivedSize! + receivedBuffer.byteLength;
          const newProgress = Math.floor(
            (newReceivedSize / receivingFile.current.totalSize) * 100
          );

          setTransferProgress(newProgress);
          receivingFile.current.receivedChunks.push(receivedBuffer);
          receivingFile.current.receivedSize = newReceivedSize;

          if (newReceivedSize >= receivingFile.current.totalSize) {
            dataChannelRef.current?.send(
              JSON.stringify({
                type: "file-received",
              })
            );
            setLoading(false);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [receivingFile, setError]
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
      const receivedChannel = event.channel;

      dataChannelRef.current = receivedChannel;

      receivedChannel.onopen = () => {
        setDataChannelState({ isReady: true, isOpen: true });
      };

      receivedChannel.onclose = () => {
        setDataChannelState({ isReady: false, isOpen: false });
      };

      receivedChannel.onmessage = handleIncomingMessage;
    };

    pc.onicecandidate = (event) => {
      const currentSocket = socketRef.current;

      if (event.candidate && currentSocket && targetIdRef.current) {
        const candidateKey = `${event.candidate.candidate}:${event.candidate.sdpMid}:${event.candidate.sdpMLineIndex}`;

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

    pc.onicecandidateerror = () => {
      setError("Peer not found, please try again");
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setError("Peer not found, please try again");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [handleIncomingMessage, socketRef]);

  const joinSession = useCallback(
    (targetSessionId: string) => {
      targetIdRef.current = targetSessionId;
      const currentSocket = socketRef.current;
      if (currentSocket && isConnected) {
        console.log("Joining session", targetSessionId);
        currentSocket.send(
          JSON.stringify({
            action: "join_session",
            target: targetSessionId,
          })
        );
      }
    },
    [isConnected, socketRef]
  );

  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceiverMessages = async (event: MessageEvent) => {
      const msg: WebRTCMessage = JSON.parse(event.data);

      switch (msg.action) {
        case "session_created":
          console.log("Session created", msg.session_id);
          setSessionId(msg.session_id!);
          break;

        case "offer":
          console.log("Got offer");
          const pc2 = createPeerConnection();
          await pc2.setRemoteDescription(JSON.parse(msg.sdp!));
          const answer = await pc2.createAnswer();
          await pc2.setLocalDescription(answer);

          socketRef.current?.send(
            JSON.stringify({
              action: "answer",
              sdp: JSON.stringify(answer),
              target: msg.session_id,
            })
          );
          break;

        case "candidate":
          if (!msg.candidate || !peerConnectionRef.current) return;
          const candidate = new RTCIceCandidate(JSON.parse(msg.candidate!));
          await peerConnectionRef.current.addIceCandidate(candidate);
          break;

        case "peer_left":
          setError("Peer left the session");
          break;

        case "error":
          setError(msg.sdp!);
          break;
      }
    };

    socketRef.current.addEventListener("message", handleReceiverMessages);

    return () => {
      socketRef.current?.removeEventListener("message", handleReceiverMessages);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      targetIdRef.current = null;
      setMetadataLoaded(false);
      receivingFile.current = null;
    };
  }, [createPeerConnection, setError]);

  // Helper function to assemble and download the received file
  const downloadReceivedFile = useCallback(() => {
    if (
      !receivingFile.current?.metadata ||
      receivingFile.current?.receivedChunks.length === 0
    ) {
      return null;
    }

    const fileBlob = new Blob(receivingFile.current.receivedChunks);
    const downloadUrl = URL.createObjectURL(fileBlob);

    return {
      name: receivingFile.current.metadata.name,
      url: downloadUrl,
      size: receivingFile.current.totalSize,
    };
  }, []);

  return {
    ...base,
    joinSession,
    receivingFile,
    downloadReceivedFile,
    metadataLoaded,
    sendDownloadRequest,
    passwordError,
    setPasswordError,
    dataChannel: {
      isReady: dataChannelState.isReady,
      isOpen: dataChannelState.isOpen,
    },
    loading,
    transferProgress,
  };
};
