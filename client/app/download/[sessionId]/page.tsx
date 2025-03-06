/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useWebRTCReceiver } from "@/hooks/webrtc";
import { SIGNALING_SERVER } from "@/config/keys";

export default function DownloadPage() {
  const params = useParams();
  const fileId = params.sessionId as string;

  // const [fileInfo, setFileInfo] = useState<{
  //   name: string;
  //   size: number;
  //   type: string;
  //   passwordProtected: boolean;
  // } | null>(null);
  // const [password, setPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const {
    joinSession,
    sessionId,
    createSession,
    isConnected,
    error: socketError,
    receivingFile,
    metadataLoaded,
    sendDownloadRequest,
    dataChannel,

    transferProgress,
  } = useWebRTCReceiver(SIGNALING_SERVER);

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
    joinSession(fileId);
  }, [fileId, joinSession, sessionId, isConnected]);

  const handleDownload = useCallback(() => {
    if (!dataChannel.isReady) return;
    setIsDownloading(true);
    sendDownloadRequest();
  }, [dataChannel, sendDownloadRequest]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  useEffect(() => {
    if (transferProgress >= 100) {
      const fileBlob = new Blob(receivingFile.current?.receivedChunks, {
        type:
          receivingFile.current?.metadata?.type || "application/octet-stream",
      });

      const downloadUrl = URL.createObjectURL(fileBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = receivingFile.current?.metadata?.name || "downloaded_file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsDownloading(false);
    }
  }, [transferProgress]);

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
          {metadataLoaded && receivingFile.current ? (
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
                    <span>{transferProgress}%</span>
                  </div>
                  <Progress value={transferProgress} className="h-2" />
                </div>
              )}

              {transferProgress >= 100 ? (
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
