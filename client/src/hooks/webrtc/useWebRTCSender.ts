/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useWebRTCBase, WebRTCMessage } from "./useWebRTCbase";

// Sender-specific logic
export const useWebRTCSender = (wsUrl: string) => {
  const base = useWebRTCBase(wsUrl);
  const { socketRef, setError, setSessionId } = base;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [loading, setLoading] = useState(false);

  const [dataChannelState, setDataChannelState] = useState<{
    isReady: boolean;
    isOpen: boolean;
  }>({
    isReady: false,
    isOpen: false,
  });

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

    pc.onicecandidate = (event) => {
      const currentSocket = socketRef.current;

      if (
        event.candidate &&
        currentSocket &&
        targetIdRef.current &&
        currentSocket.readyState === WebSocket.OPEN
      ) {
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
          console.error("Error sending ICE candidate:", err);
        }
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error("ICE candidate error", event);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socketRef]);

  // Safe send method that checks socket is available and open
  const safeSend = useCallback(
    (data: any) => {
      const currentSocket = socketRef.current;
      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        try {
          currentSocket.send(JSON.stringify(data));
          return true;
        } catch (err) {
          console.error("Error sending data:", err);
          return false;
        }
      } else {
        console.error("WebSocket not available or not open");
        return false;
      }
    },
    [socketRef]
  );
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

  // Handle peer joined and create offer
  const handlePeerJoined = useCallback(
    async (peerId: string) => {
      targetIdRef.current = peerId;

      const pc = createPeerConnection();
      const dataChannel = pc.createDataChannel("fileTransfer");

      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        setDataChannelState({ isReady: true, isOpen: true });
      };

      dataChannel.onclose = () => {
        setDataChannelState({ isReady: false, isOpen: false });
      };

      dataChannel.onerror = (err) => {
        console.error("Data channel error:", err);
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait a moment to ensure the local description is set
        setTimeout(() => {
          safeSend({
            action: "offer",
            sdp: JSON.stringify(pc.localDescription),
            target: peerId,
          });
        }, 100);
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    },
    [createPeerConnection, safeSend]
  );

  useEffect(() => {
    if (!socketRef.current) return;

    const handleSenderMessages = async (event: MessageEvent) => {
      try {
        const msg: WebRTCMessage = JSON.parse(event.data);

        switch (msg.action) {
          case "session_created":
            setSessionId(msg.session_id!);
            break;

          case "peer_joined":
            if (msg.session_id) {
              handlePeerJoined(msg.session_id);
            }
            break;

          case "answer":
            if (peerConnectionRef.current && msg.sdp) {
              try {
                const answerDesc = JSON.parse(msg.sdp);
                await peerConnectionRef.current.setRemoteDescription(
                  answerDesc
                );
              } catch (err) {
                console.error("Error setting remote description:", err);
              }
            }
            break;

          case "candidate":
            if (peerConnectionRef.current && msg.candidate) {
              try {
                const candidate = new RTCIceCandidate(
                  JSON.parse(msg.candidate)
                );
                await peerConnectionRef.current.addIceCandidate(candidate);
              } catch (err) {
                console.error("Error adding ICE candidate:", err);
              }
            }
            break;

          case "error":
            setError(msg.sdp || "Unknown error");
            setTimeout(() => setError(null), 5000);
            break;
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    };

    socketRef.current.addEventListener("message", handleSenderMessages);

    return () => {
      if (socketRef.current) {
        socketRef.current.removeEventListener("message", handleSenderMessages);
      }

      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      targetIdRef.current = null;
    };
  }, [handlePeerJoined, setSessionId, setError]);

  return {
    ...base,
    sendFile,
    dataChannel: {
      isReady: dataChannelState.isReady,
      isOpen: dataChannelState.isOpen,
    },
    loading,
  };
};
