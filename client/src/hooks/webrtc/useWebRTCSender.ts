/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useWebRTCBase, WebRTCMessage } from "./useWebRTCbase";
import { FileDownloadOptions } from "../../../app/upload/page";

// Sender-specific logic
export const useWebRTCSender = (wsUrl: string) => {
  const base = useWebRTCBase(wsUrl);
  const { socketRef, setError, setSessionId } = base;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const fileRef = useRef<File | null>(null);
  const fileOptionsRef = useRef<FileDownloadOptions | null>(null);

  // state for tracking total file downloads
  const [totalDownloads, setTotalDownloads] = useState(0);

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

  // send metadata first
  const sendMetadata = useCallback(
    (file: File, options?: FileDownloadOptions) => {
      fileRef.current = file;
      if (options) fileOptionsRef.current = options;

      try {
        dataChannelRef.current?.send(
          JSON.stringify({
            type: "file-metadata",
            name: fileRef.current.name,
            size: fileRef.current.size,
          })
        );
      } catch (err) {
        console.log("Error sending metadata", err);
      }
    },

    [dataChannelRef]
  );

  const sendFile = useCallback(() => {
    const chunkSize = 16384;
    const fileReader = new FileReader();
    let offset = 0;

    if (
      totalDownloads &&
      fileOptionsRef.current?.downloadLimit &&
      totalDownloads >= fileOptionsRef.current.downloadLimit
    ) {
      console.log("Sending download limit reached");
      dataChannelRef.current?.send(
        JSON.stringify({ type: "download-limit-reached" })
      );
      return;
    }

    fileReader.onload = (e) => {
      if (!fileRef.current) {
        console.error("No file to send");
        return;
      }
      if (!e.target?.result || !dataChannelRef.current) return;

      console.log(e.target?.result);
      dataChannelRef.current.send(e.target.result as ArrayBuffer);
      offset += chunkSize;

      if (offset < fileRef.current.size) {
        readSlice(offset);
      }
    };

    const readSlice = (offset: number) => {
      if (!fileRef.current) return;
      const slice = fileRef.current.slice(offset, offset + chunkSize);

      fileReader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  }, [totalDownloads]);

  // handling send file request
  const handleIncomingMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const jsonData = JSON.parse(event.data);
        console.log(jsonData);

        if (jsonData.type == "send-file-request") sendFile();
        else if (jsonData.type == "file-received") {
          setTotalDownloads((prev) => prev + 1);

          cleanupConnection();
        }
      } catch (err) {
        console.log(err);
      }
    },
    [sendFile]
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

      dataChannel.onmessage = handleIncomingMessage;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait a moment to ensure the local description is set
        safeSend({
          action: "offer",
          sdp: JSON.stringify(pc.localDescription),
          target: peerId,
        });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    },
    [createPeerConnection, handleIncomingMessage, safeSend]
  );

  const cleanupConnection = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    targetIdRef.current = null;
  }, [dataChannelRef, peerConnectionRef, targetIdRef]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleSenderMessages = async (event: MessageEvent) => {
      try {
        const msg: WebRTCMessage = JSON.parse(event.data);

        switch (msg.action) {
          case "session_created":
            console.log("Session created", msg.session_id);
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
            break;
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    };

    socketRef.current.addEventListener("message", handleSenderMessages);

    return () => {
      cleanupConnection();
      fileRef.current = null;
      fileOptionsRef.current = null;
    };
  }, [
    cleanupConnection,
    handlePeerJoined,
    setError,
    socketRef,
    setSessionId,
    safeSend,
    totalDownloads,
  ]);

  return {
    ...base,
    sendMetadata,
    totalDownloads,
    cleanupConnection,
    dataChannel: {
      isReady: dataChannelState.isReady,
      isOpen: dataChannelState.isOpen,
    },
  };
};
