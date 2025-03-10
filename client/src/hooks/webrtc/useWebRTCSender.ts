/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useWebRTCBase, WebRTCMessage } from "./useWebRTCbase";
import { FileDownloadOptions } from "../../../app/upload/page";

// Enhanced sender-specific logic for multiple concurrent connections
export const useWebRTCSender = (wsUrl: string) => {
  const base = useWebRTCBase(wsUrl);
  const { socketRef, setError, setSessionId, isConnected } = base;

  // Maps to track multiple connections
  const peerConnectionMap = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelMap = useRef<Map<string, RTCDataChannel>>(new Map());
  const fileDownloadOptionsRef = useRef<FileDownloadOptions | null>(null);

  // Track active file transfers
  const activeTransfers = useRef<
    Map<
      string,
      {
        file: File;
        options: FileDownloadOptions | null;
        progress: number;
        offset: number;
      }
    >
  >(new Map());

  // Keep track of whether we're unmounting the component
  const isUnmounting = useRef(false);

  // State tracking
  const totalDownloadsRef = useRef(0);
  const [transfersInProgress, setTransfersInProgress] = useState<string[]>([]);
  const [transferProgress, setTransferProgress] = useState<
    Record<string, number>
  >({});
  const [dataChannelStates, setDataChannelStates] = useState<
    Record<
      string,
      {
        isReady: boolean;
        isOpen: boolean;
      }
    >
  >({});

  // Create peer connection with improved error handling
  const createPeerConnection = useCallback(
    (peerId: string) => {
      if (peerConnectionMap.current.has(peerId)) {
        peerConnectionMap.current.get(peerId)?.close();
        peerConnectionMap.current.delete(peerId);
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        iceTransportPolicy: "all",
        iceCandidatePoolSize: 2,
      });

      const sentCandidates = new Set<string>();

      pc.onicecandidate = (event) => {
        // Don't process if we're unmounting
        if (isUnmounting.current) return;

        const currentSocket = socketRef.current;
        if (event.candidate && currentSocket && isConnected) {
          const candidateKey = `${event.candidate.candidate}:${event.candidate.sdpMid}:${event.candidate.sdpMLineIndex}`;
          if (sentCandidates.has(candidateKey)) return;
          sentCandidates.add(candidateKey);

          try {
            currentSocket.send(
              JSON.stringify({
                action: "candidate",
                candidate: JSON.stringify(event.candidate),
                target: peerId,
              })
            );
          } catch (err) {
            if (!isUnmounting.current) {
              console.error("Error sending ICE candidate:", err);
            }
          }
        }
      };

      pc.onicecandidateerror = (event) => {
        if (!isUnmounting.current) {
          console.error("ICE candidate error for peer", peerId, event);
        }
      };

      pc.onconnectionstatechange = () => {
        if (isUnmounting.current) return;

        console.log(
          `Connection state change for ${peerId}:`,
          pc.connectionState
        );
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          cleanupSingleConnection(peerId);
        }
      };

      peerConnectionMap.current.set(peerId, pc);
      return pc;
    },
    [socketRef]
  );

  // Safe send method that checks socket is available and open
  const safeSend = useCallback(
    (data: any) => {
      // Don't send if we're unmounting
      if (isUnmounting.current) return false;

      const currentSocket = socketRef.current;
      if (currentSocket && isConnected) {
        try {
          currentSocket.send(JSON.stringify(data));
          return true;
        } catch (err) {
          if (!isUnmounting.current) {
            console.error("Error sending data:", err);
          }
          return false;
        }
      } else {
        if (!isUnmounting.current) {
          console.error("WebSocket not available or not open");
        }
        return false;
      }
    },
    [socketRef]
  );

  // Clean up a single connection
  const cleanupSingleConnection = useCallback((peerId: string) => {
    // Close and remove data channel
    const dataChannel = dataChannelMap.current.get(peerId);
    if (dataChannel) {
      try {
        dataChannel.close();
      } catch (err) {
        console.error(`Error closing data channel for peer ${peerId}:`, err);
      }
      dataChannelMap.current.delete(peerId);
    }

    // Close and remove peer connection
    const peerConnection = peerConnectionMap.current.get(peerId);
    if (peerConnection) {
      try {
        peerConnection.close();
      } catch (err) {
        console.error(`Error closing peer connection for ${peerId}:`, err);
      }
      peerConnectionMap.current.delete(peerId);
    }

    // Remove from active transfers
    activeTransfers.current.delete(peerId);

    // Only update states if we're not unmounting
    if (!isUnmounting.current) {
      // Update states
      setDataChannelStates((prev) => {
        const updated = { ...prev };
        delete updated[peerId];
        return updated;
      });

      setTransfersInProgress((prev) => prev.filter((id) => id !== peerId));
      setTransferProgress((prev) => {
        const updated = { ...prev };
        delete updated[peerId];
        return updated;
      });
    }

    console.log(`Cleaned up connection for peer ${peerId}`);
  }, []);

  // Clean up all connections - only called on real unmount
  const cleanupAllConnections = useCallback(() => {
    // Set the unmounting flag to prevent state updates
    isUnmounting.current = true;

    // Get all peer IDs
    const peerIds = Array.from(peerConnectionMap.current.keys());

    // Clean up each connection
    peerIds.forEach((peerId) => {
      // Close data channel
      const dataChannel = dataChannelMap.current.get(peerId);
      if (dataChannel) {
        try {
          dataChannel.close();
        } catch (e) {
          console.error(`Error closing data channel for ${peerId}:`, e);
        }
      }

      // Close peer connection
      const peerConnection = peerConnectionMap.current.get(peerId);
      if (peerConnection) {
        try {
          peerConnection.close();
        } catch (e) {
          console.error(`Error closing peer connection for ${peerId}:`, e);
        }
      }
    });

    // Clear all maps
    dataChannelMap.current.clear();
    peerConnectionMap.current.clear();
    activeTransfers.current.clear();

    console.log("All connections cleaned up during unmount");
  }, []);

  // Send metadata to a specific peer
  const sendMetadata = useCallback(
    (file: File, peerId: string, options?: FileDownloadOptions) => {
      if (isUnmounting.current) return false;
      fileDownloadOptionsRef.current = options || null;

      const dataChannel = dataChannelMap.current?.get(peerId);
      if (!dataChannel || dataChannel.readyState !== "open") {
        console.error(`Data channel not ready for peer ${peerId}`);
        return false;
      }

      // Store file info for this peer
      activeTransfers.current.set(peerId, {
        file,
        options: options || null,
        progress: 0,
        offset: 0,
      });

      try {
        dataChannel.send(
          JSON.stringify({
            type: "file-metadata",
            name: file.name,
            size: file.size,
            isPasswordProtected:
              options?.password.isEnabled && !!options.password.value,
          })
        );

        console.log(`Metadata sent to peer ${peerId} for file ${file.name}`);
        return true;
      } catch (err) {
        console.error(`Error sending metadata to peer ${peerId}:`, err);
        return false;
      }
    },
    []
  );

  // New: Send metadata to multiple peers
  const broadcastMetadata = useCallback(
    (file: File, options?: FileDownloadOptions) => {
      if (isUnmounting.current) return [];

      const peers = Array.from(dataChannelMap.current.keys());
      console.log(`Broadcasting metadata to ${peers.length} peers`);

      const results = peers.map((peerId) => ({
        peerId,
        success: sendMetadata(file, peerId, options),
      }));

      return results;
    },
    [sendMetadata]
  );

  // Send file to a specific peer
  const sendFile = useCallback((peerId: string) => {
    if (isUnmounting.current) return;

    const transferInfo = activeTransfers.current.get(peerId);
    if (!transferInfo) {
      console.error(`No file info for peer ${peerId}`);
      return;
    }

    const { file, options, offset } = transferInfo;
    const dataChannel = dataChannelMap.current?.get(peerId);

    if (!dataChannel || dataChannel.readyState !== "open") {
      console.error(`Data channel not ready for peer ${peerId}`);
      return;
    }

    // Check download limits
    if (
      totalDownloadsRef.current > 0 &&
      options?.downloadLimit &&
      totalDownloadsRef.current >= options.downloadLimit
    ) {
      console.log(`Download limit reached for peer ${peerId}`);
      dataChannel.send(JSON.stringify({ type: "download-limit-reached" }));
      return;
    }

    // Add to in-progress transfers if not already there
    setTransfersInProgress((prev) =>
      prev.includes(peerId) ? prev : [...prev, peerId]
    );

    const chunkSize = 16384;
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      // Skip if we're unmounting
      if (isUnmounting.current) return;

      if (!e.target?.result) return;

      const dataChannel = dataChannelMap.current?.get(peerId);
      if (!dataChannel || dataChannel.readyState !== "open") return;

      try {
        dataChannel.send(e.target.result as ArrayBuffer);

        // Check if this transfer was canceled or we're unmounting
        if (isUnmounting.current || !activeTransfers.current.has(peerId))
          return;

        // Get the latest transfer info (it might have changed)
        const currentTransferInfo = activeTransfers.current.get(peerId);
        if (!currentTransferInfo) return;

        // Update progress
        const newOffset = currentTransferInfo.offset + chunkSize;
        const progress = Math.min(
          100,
          Math.round((newOffset / file.size) * 100)
        );

        // Update transfer info
        activeTransfers.current.set(peerId, {
          ...currentTransferInfo,
          offset: newOffset,
          progress,
        });

        // Update progress state
        setTransferProgress((prev) => ({
          ...prev,
          [peerId]: progress,
        }));

        // Continue if there's more to send and we're not unmounting
        if (newOffset < file.size && !isUnmounting.current) {
          readSlice(peerId, newOffset);
        }
      } catch (err) {
        if (!isUnmounting.current) {
          console.error(`Error sending file chunk to peer ${peerId}:`, err);
        }
      }
    };

    const readSlice = (peerId: string, offset: number) => {
      // Skip if we're unmounting
      if (isUnmounting.current) return;

      const transferInfo = activeTransfers.current.get(peerId);
      if (!transferInfo) return;

      const slice = transferInfo.file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    // Start reading from current offset
    readSlice(peerId, offset);
  }, []);

  // Handle incoming messages from peers
  const handleIncomingMessage = useCallback(
    (event: MessageEvent, peerId: string) => {
      // Skip if we're unmounting
      if (isUnmounting.current) return;

      try {
        const jsonData = JSON.parse(event.data);
        console.log(`Message from peer ${peerId}:`, jsonData);

        if (jsonData.type === "send-file-request") {
          console.log(`File request from peer ${peerId}`);
          // check for password in jsonData
          if (fileDownloadOptionsRef.current?.password?.value) {
            const password = fileDownloadOptionsRef.current.password.value;
            if (jsonData.password !== password) {
              console.log(`Password mismatch for peer ${peerId}`);
              dataChannelMap.current.get(peerId)?.send(
                JSON.stringify({
                  type: "password-incorrect",
                  message: "Incorrect password",
                })
              );
              return;
            }
          }

          sendFile(peerId);
        } else if (jsonData.type === "file-received") {
          console.log(`File received confirmation from peer ${peerId}`);

          // We're keeping the connection open, just updating states
          // Increment total downloads
          totalDownloadsRef.current += 1;

          // Mark this specific transfer as complete
          setTransfersInProgress((prev) => prev.filter((id) => id !== peerId));

          // Reset progress for this peer only
          setTransferProgress((prev) => {
            const updated = { ...prev };
            delete updated[peerId];
            return updated;
          });

          // Reset transfer data for this peer
          if (activeTransfers.current.has(peerId)) {
            const currentInfo = activeTransfers.current.get(peerId);
            if (currentInfo) {
              activeTransfers.current.set(peerId, {
                ...currentInfo,
                progress: 0,
                offset: 0,
              });
            }
          }

          cleanupSingleConnection(peerId);
        } else if (jsonData.type === "error") {
          console.error(`Error from peer ${peerId}:`, jsonData.message);
        }
      } catch (err) {
        if (!isUnmounting.current) {
          console.error(`Error handling message from peer ${peerId}:`, err);
        }
      }
    },
    [sendFile]
  );

  // Handle new peer joining and create offer
  const handlePeerJoined = useCallback(
    async (peerId: string) => {
      if (isUnmounting.current) return;

      const pc = createPeerConnection(peerId);
      const dataChannel = pc.createDataChannel("fileTransfer");
      dataChannelMap.current.set(peerId, dataChannel);

      // Data channel event handlers
      dataChannel.onopen = () => {
        if (isUnmounting.current) return;

        console.log(`Data channel opened for peer ${peerId}`);
        setDataChannelStates((prev) => ({
          ...prev,
          [peerId]: { isReady: true, isOpen: true },
        }));
      };

      dataChannel.onclose = () => {
        if (isUnmounting.current) return;

        console.log(`Data channel closed for peer ${peerId}`);
        setDataChannelStates((prev) => ({
          ...prev,
          [peerId]: { isReady: false, isOpen: false },
        }));

        // send close signal to all connected peers
        safeSend({ action: "peer_left", session_id: peerId });
      };

      dataChannel.onerror = (error) => {
        if (isUnmounting.current) return;
        console.error(`Data channel error for peer ${peerId}:`, error);
      };

      dataChannel.onmessage = (event) => handleIncomingMessage(event, peerId);

      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Skip if we started unmounting during async operation
        if (isUnmounting.current) return;

        // Send the offer
        safeSend({
          action: "offer",
          sdp: JSON.stringify(pc.localDescription),
          target: peerId,
        });

        console.log(`Offer sent to peer ${peerId}`);
      } catch (err) {
        if (!isUnmounting.current) {
          console.error(`Error creating offer for peer ${peerId}:`, err);
        }
      }
    },
    [createPeerConnection, handleIncomingMessage, safeSend]
  );

  // Set up event listeners for WebSocket
  useEffect(() => {
    if (!socketRef.current) return;

    // Reset unmounting flag when the hook is initialized
    isUnmounting.current = false;

    const handleSenderMessages = async (event: MessageEvent) => {
      // Skip processing if we're unmounting
      if (isUnmounting.current) return;

      try {
        const msg: WebRTCMessage = JSON.parse(event.data);

        switch (msg.action) {
          case "session_created":
            console.log("Session created", msg.session_id);
            setSessionId(msg.session_id!);
            break;

          case "peer_joined":
            console.log("Peer joined", msg.session_id);
            if (msg.session_id) {
              handlePeerJoined(msg.session_id);
            }
            break;

          case "peer_left":
            console.log("Peer left", msg.session_id);
            if (msg.session_id) {
              cleanupSingleConnection(msg.session_id);
            }
            break;

          case "answer":
            console.log("Got answer", msg.session_id);
            if (
              msg.session_id &&
              peerConnectionMap.current?.has(msg.session_id) &&
              msg.sdp
            ) {
              try {
                const answerDesc = JSON.parse(msg.sdp);
                await peerConnectionMap.current
                  ?.get(msg.session_id)
                  ?.setRemoteDescription(answerDesc);
              } catch (err) {
                console.error(
                  `Error setting remote description for peer ${msg.session_id}:`,
                  err
                );
              }
            }
            break;

          case "candidate":
            if (
              msg.target &&
              peerConnectionMap.current.has(msg.target) &&
              msg.candidate
            ) {
              try {
                const candidate = new RTCIceCandidate(
                  JSON.parse(msg.candidate)
                );
                await peerConnectionMap.current
                  .get(msg.target)
                  ?.addIceCandidate(candidate);
              } catch (err) {
                console.error(
                  `Error adding ICE candidate for peer ${msg.target}:`,
                  err
                );
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

    socketRef.current.onAny(handleSenderMessages);

    // Clean up ONLY when the component is truly unmounting
    return () => {
      // Set flag to prevent further state updates during cleanup
      isUnmounting.current = true;
      console.log("Component unmounting, cleaning up all connections");

      // Remove event listener
      socketRef.current?.offAny(handleSenderMessages);

      // Clean up all connections
      cleanupAllConnections();
    };
  }, [
    cleanupAllConnections,
    cleanupSingleConnection,
    handlePeerJoined,
    setError,
    socketRef,
    setSessionId,
    safeSend,
  ]);

  // Method to manually reset a peer's transfer state without closing the connection
  const resetPeerTransfer = useCallback((peerId: string) => {
    if (activeTransfers.current.has(peerId)) {
      const currentInfo = activeTransfers.current.get(peerId);
      if (currentInfo) {
        activeTransfers.current.set(peerId, {
          ...currentInfo,
          progress: 0,
          offset: 0,
        });
      }
    }

    setTransfersInProgress((prev) => prev.filter((id) => id !== peerId));
    setTransferProgress((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  }, []);

  const getPeerIds = useCallback(
    () => Array.from(peerConnectionMap.current.keys()),
    [peerConnectionMap]
  );

  // Return enhanced API
  return {
    ...base,
    sendMetadata,
    broadcastMetadata,
    totalDownloads: totalDownloadsRef.current,
    transfersInProgress,
    transferProgress,
    dataChannelStates,
    cleanupConnection: cleanupAllConnections,
    cleanupPeerConnection: cleanupSingleConnection,
    resetPeerTransfer,
    peerIds: getPeerIds(),
    getActiveTransferCount: () => transfersInProgress.length,
    getConnectedPeerCount: () => peerConnectionMap.current.size,
  };
};
