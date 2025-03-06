/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import QRCodeScanner from "@/components/qr-code-scanner";
import { useWebRTCReceiver } from "@/hooks/webrtc";
import { SIGNALING_SERVER } from "@/config/keys";

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.sessionId as string;

  // const [fileInfo, setFileInfo] = useState<{
  //   name: string;
  //   size: number;
  //   type: string;
  //   passwordProtected: boolean;
  // } | null>(null);
  // const [password, setPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    joinSession,
    sessionId,
    createSession,
    isConnected,
    error: socketError,
    receivingFile,

    transferProgress,
  } = useWebRTCReceiver(SIGNALING_SERVER);

  console.log(transferProgress);

  useEffect(() => {
    if (!isConnected || sessionId) return;
    try {
      createSession();
    } catch (err) {
      setError("Failed to connect to peer. Please try again later.");
      console.log(err);
    }
  }, [createSession, isConnected, sessionId]);

  useEffect(() => {
    if (!sessionId || !isConnected) return;
    try {
      joinSession(fileId);
    } catch (err) {
      setError("Failed to connect to peer. Please try again later.");
      console.log(err);
    }
  }, [fileId, joinSession, sessionId]);

  const handleDownload = () => {
    if (!receivingFile.current?.metadata) return;
    if (transferProgress < 100) return;

    const fileBlob = new Blob(receivingFile.current.receivedChunks, {
      type: "application/octet-stream",
    });

    setIsDownloading(true);
    setDownloadProgress(0);

    // Create a download worker to track progress
    const downloadWorker = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `
    self.onmessage = async (event) => {
      const { fileBlob, fileName } = event.data;
      
      try {
        // Simulate download progress
        const totalSize = fileBlob.size;
        const chunkSize = 1024 * 1024; // 1MB chunks
        let downloadedSize = 0;

        while (downloadedSize < totalSize) {
          // Simulate chunk download
          const chunk = fileBlob.slice(downloadedSize, downloadedSize + chunkSize);
          downloadedSize += chunk.size;

          // Report progress
          self.postMessage({
            type: 'progress',
            progress: Math.min(100, Math.round((downloadedSize / totalSize) * 100))
          });

          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Download complete
        self.postMessage({ type: 'complete' });
      } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
      }
    }
  `,
          ],
          { type: "application/javascript" }
        )
      )
    );

    // Create download link
    const downloadUrl = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = receivingFile.current.metadata.name;

    // Worker message handler
    downloadWorker.onmessage = (event) => {
      switch (event.data.type) {
        case "progress":
          setDownloadProgress(event.data.progress);
          break;
        case "complete":
          a.click();
          URL.revokeObjectURL(downloadUrl);
          setIsDownloading(false);
          setIsComplete(true);
          setDownloadProgress(100);
          downloadWorker.terminate();
          break;
        case "error":
          console.error("Download error:", event.data.error);
          setIsDownloading(false);
          downloadWorker.terminate();
          break;
      }
    };

    // Start the download
    downloadWorker.postMessage({
      fileBlob,
      fileName: receivingFile.current.metadata.name,
    });

    setError(null);
  };

  const handleQRScan = (result: string | null) => {
    if (result) {
      const url = new URL(result);
      const scannedFileId = url.pathname.split("/").pop();
      if (scannedFileId && scannedFileId !== fileId) {
        router.push(`/download/${scannedFileId}`);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="container max-w-2xl py-12 px-4 lg:px-0 lg:mx-auto">
      <Button variant="ghost" asChild className="mb-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-6">
          {transferProgress > 0 && transferProgress < 100 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Downloading...</span>
                <span>{transferProgress}%</span>
              </div>
              <Progress value={transferProgress} className="h-2" />
            </div>
          ) : receivingFile.current.metadata ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Download File</h1>
                <p className="text-muted-foreground">
                  You're about to download a file shared with you via
                  ShareDirect.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {receivingFile.current.metadata?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(
                        receivingFile.current.metadata?.size || 0
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Secure P2P Transfer</span>
                  </div>
                </div>
              </div>
              {/* 
              {fileInfo.passwordProtected && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter file password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )} */}

              {isDownloading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Downloading...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <Progress value={downloadProgress} className="h-2" />
                </div>
              )}

              {isComplete ? (
                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-2">
                    <Download className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Download Complete!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your file has been successfully downloaded.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/">Return to Home</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              )}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Scan QR Code</h3>
                <QRCodeScanner onScan={handleQRScan} />
              </div>
            </div>
          ) : error || socketError ? (
            <div className="py-12 text-center space-y-4">
              <div className="inline-flex items-center justify-center rounded-full bg-amber-100 p-2">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">File Not Found</h3>
                <p className="text-sm text-muted-foreground">
                  The file you're looking for may have expired, been downloaded
                  already, or never existed.
                </p>
              </div>
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
