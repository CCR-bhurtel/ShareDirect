export interface PeerConnection {
  id: string
  connection: RTCPeerConnection | null
  dataChannel: RTCDataChannel | null
}

export interface FileChunk {
  id: string
  fileId: string
  chunkIndex: number
  totalChunks: number
  data: ArrayBuffer
}

// Initialize a peer connection
export const initPeerConnection = (): PeerConnection => {
  const id = generateId()

  // Create RTCPeerConnection with STUN servers for NAT traversal
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  })

  // Create data channel for file transfer
  const dataChannel = connection.createDataChannel("fileTransfer", {
    ordered: true,
  })

  return {
    id,
    connection,
    dataChannel,
  }
}

// Generate a unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15)
}

// Create an offer (sender side)
export const createOffer = async (peerConnection: PeerConnection): Promise<RTCSessionDescriptionInit> => {
  if (!peerConnection.connection) {
    throw new Error("Peer connection not initialized")
  }

  const offer = await peerConnection.connection.createOffer()
  await peerConnection.connection.setLocalDescription(offer)

  return offer
}

// Handle an offer (receiver side)
export const handleOffer = async (
  peerConnection: PeerConnection,
  offer: RTCSessionDescriptionInit,
): Promise<RTCSessionDescriptionInit> => {
  if (!peerConnection.connection) {
    throw new Error("Peer connection not initialized")
  }

  await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(offer))
  const answer = await peerConnection.connection.createAnswer()
  await peerConnection.connection.setLocalDescription(answer)

  return answer
}

// Handle an answer (sender side)
export const handleAnswer = async (
  peerConnection: PeerConnection,
  answer: RTCSessionDescriptionInit,
): Promise<void> => {
  if (!peerConnection.connection) {
    throw new Error("Peer connection not initialized")
  }

  await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(answer))
}

// Handle ICE candidate
export const handleIceCandidate = (peerConnection: PeerConnection, candidate: RTCIceCandidateInit): Promise<void> => {
  if (!peerConnection.connection) {
    throw new Error("Peer connection not initialized")
  }

  return peerConnection.connection.addIceCandidate(new RTCIceCandidate(candidate))
}

// Send a file through the data channel
export const sendFile = (
  peerConnection: PeerConnection,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!peerConnection.dataChannel) {
      reject(new Error("Data channel not initialized"))
      return
    }

    const fileReader = new FileReader()
    const chunkSize = 16384 // 16KB chunks
    let offset = 0
    const fileId = generateId()
    let chunkIndex = 0
    const totalChunks = Math.ceil(file.size / chunkSize)

    fileReader.onload = (e) => {
      if (!e.target?.result || !peerConnection.dataChannel) {
        reject(new Error("Failed to read file chunk"))
        return
      }

      const chunk: FileChunk = {
        id: generateId(),
        fileId,
        chunkIndex,
        totalChunks,
        data: e.target.result as ArrayBuffer,
      }

      peerConnection.dataChannel.send(
        JSON.stringify({
          type: "chunk",
          metadata: {
            id: chunk.id,
            fileId: chunk.fileId,
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
        }),
      )

      // Send the actual data as ArrayBuffer
      peerConnection.dataChannel.send(chunk.data)

      offset += chunkSize
      chunkIndex++

      const progress = Math.min(100, Math.round((offset / file.size) * 100))
      onProgress(progress)

      if (offset < file.size) {
        readSlice(offset)
      } else {
        // File transfer complete
        peerConnection.dataChannel.send(
          JSON.stringify({
            type: "complete",
            fileId,
          }),
        )
        resolve()
      }
    }

    fileReader.onerror = (error) => {
      reject(error)
    }

    const readSlice = (o: number) => {
      const slice = file.slice(o, o + chunkSize)
      fileReader.readAsArrayBuffer(slice)
    }

    readSlice(0)
  })
}

// Receive a file through the data channel
export const receiveFile = (
  peerConnection: PeerConnection,
  onProgress: (progress: number) => void,
  onComplete: (file: Blob, fileName: string, fileType: string) => void,
): void => {
  if (!peerConnection.dataChannel) {
    throw new Error("Data channel not initialized")
  }

  const fileChunks: Map<string, Array<ArrayBuffer>> = new Map()
  const fileMetadata: Map<
    string,
    {
      fileName: string
      fileType: string
      fileSize: number
      totalChunks: number
    }
  > = new Map()

  let currentFileId: string | null = null
  let expectingArrayBuffer = false

  peerConnection.dataChannel.onmessage = (event) => {
    if (expectingArrayBuffer) {
      // This is the ArrayBuffer data for the chunk
      if (currentFileId && event.data instanceof ArrayBuffer) {
        if (!fileChunks.has(currentFileId)) {
          fileChunks.set(currentFileId, [])
        }

        const chunks = fileChunks.get(currentFileId)!
        chunks.push(event.data)

        const metadata = fileMetadata.get(currentFileId)!
        const progress = Math.min(100, Math.round((chunks.length / metadata.totalChunks) * 100))
        onProgress(progress)

        // Check if file transfer is complete
        if (chunks.length === metadata.totalChunks) {
          const fileBlob = new Blob(chunks, { type: metadata.fileType })
          onComplete(fileBlob, metadata.fileName, metadata.fileType)

          // Clean up
          fileChunks.delete(currentFileId)
          fileMetadata.delete(currentFileId)
        }
      }

      expectingArrayBuffer = false
    } else if (typeof event.data === "string") {
      // This is a control message
      try {
        const message = JSON.parse(event.data)

        if (message.type === "chunk") {
          currentFileId = message.metadata.fileId as string

          if (!fileMetadata.has(currentFileId)) {
            fileMetadata.set(currentFileId, {
              fileName: message.metadata.fileName,
              fileType: message.metadata.fileType,
              fileSize: message.metadata.fileSize,
              totalChunks: message.metadata.totalChunks,
            })
          }

          expectingArrayBuffer = true
        } else if (message.type === "complete") {
          // File transfer complete message (redundant check)
          currentFileId = null
        }
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }
  }
}

// Close the peer connection
export const closePeerConnection = (peerConnection: PeerConnection): void => {
  if (peerConnection.dataChannel) {
    peerConnection.dataChannel.close()
  }

  if (peerConnection.connection) {
    peerConnection.connection.close()
  }
}

