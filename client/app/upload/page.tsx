"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import FileUploader from "@/components/file-uploader";
import LinkGenerator from "@/components/link-generator";
import QRCodeGenerator from "@/components/qr-code-generator";
import ConnectedPeers from "@/components/connected-peers";
import { useWebRTCSender } from "@/hooks/webrtc/useWebRTCSender";
import { SIGNALING_SERVER } from "@/config/keys";

export interface FileDownloadOptions {
  downloadLimit: number;
  password: {
    isEnabled: boolean;
    value: string;
  };
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [downloadLimit, setDownloadLimit] = useState(1);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [currentTab, setCurrentTab] = useState("upload");

  const {
    sessionId,
    sendMetadata,
    createSession,
    dataChannelStates,
    totalDownloads,
    transfersInProgress,
    transferProgress,
    peerIds,
  } = useWebRTCSender(SIGNALING_SERVER);

  const handleFileSelected = (selectedFile: File) => {
    // check file size (10GB)
    if (selectedFile.size > 10 * 1024 * 1024 * 1024) {
      alert("File size should be less than 10GB");
      return;
    }
    setFile(selectedFile);
  };

  useEffect(() => {
    Object.keys(dataChannelStates).forEach((key) => {
      if (!dataChannelStates[key].isReady || !file) return;
      sendMetadata(file, key, {
        downloadLimit,
        password: {
          isEnabled: isPasswordProtected,
          value: password,
        },
      });
    });
  }, [
    dataChannelStates,
    file,
    sendMetadata,
    downloadLimit,
    isPasswordProtected,
    password,
  ]);

  const handleUpload = () => {
    if (!file) return;

    createSession();

    setIsUploading(false);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }, 200);
  };

  useEffect(() => {
    console.log("New session", sessionId);
    if (sessionId) {
      const generatedLink = `${window.location.origin}/download/${sessionId}`;
      setShareLink(generatedLink);
      setLinkGenerated(true);
      setCurrentTab("upload");
    }
  }, [sessionId]);

  return (
    <div className="container max-w-4xl py-12 px-4 lg:px-0 lg:mx-auto">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">Upload & Share Files</h1>
        <p className="text-muted-foreground">
          Upload your file and customize sharing options to generate a secure
          link.
        </p>
      </div>

      <Tabs value={currentTab} className="w-full">
        <TabsList className="grid w-full  grid-cols-2 md:grid-cols-4">
          <TabsTrigger onClick={() => setCurrentTab("upload")} value="upload">
            Upload File
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setCurrentTab("options")}
            value="options"
            className="mt-2 md:mt-0"
            disabled={!file || linkGenerated}
          >
            Sharing Options
          </TabsTrigger>
          <TabsTrigger
            disabled={!linkGenerated}
            onClick={() => setCurrentTab("peers")}
            value="peers"
            className="mt-2 md:mt-0"
          >
            Connected Peers
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setCurrentTab("qr")}
            value="qr"
            disabled={!linkGenerated}
            id="qr-tab"
            className="mt-2 md:mt-0"
          >
            QR Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {!linkGenerated ? (
                <>
                  <FileUploader
                    onFileSelected={handleFileSelected}
                    isUploading={isUploading}
                  />

                  {file && !isUploading && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">
                        Selected File
                      </h3>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <Button onClick={handleUpload}>Continue</Button>
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">Uploading...</h3>
                      <Progress value={uploadProgress} className="h-2 mb-2" />
                      <p className="text-sm text-muted-foreground text-right">
                        {uploadProgress}%
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <LinkGenerator
                  totalDownloads={totalDownloads}
                  downloadOptions={{
                    downloadLimit: downloadLimit,
                    password: {
                      isEnabled: isPasswordProtected,
                      value: password,
                    },
                  }}
                  shareLink={shareLink}
                  onShowQR={() => document.getElementById("qr-tab")?.click()}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="downloads">Download Limit</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {downloadLimit}{" "}
                    {downloadLimit === 1 ? "download" : "downloads"}
                  </span>
                </div>
                <Slider
                  id="downloads"
                  min={1}
                  max={10}
                  step={1}
                  value={[downloadLimit]}
                  onValueChange={(value) => setDownloadLimit(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="password-protection">
                      Password Protection
                    </Label>
                  </div>
                  <Switch
                    id="password-protection"
                    checked={isPasswordProtected}
                    onCheckedChange={setIsPasswordProtected}
                  />
                </div>

                {isPasswordProtected && (
                  <div className="pt-2">
                    <Label htmlFor="password" className="sr-only">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleUpload}>
                Generate Sharing Link
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peers" className="mt-6">
          <ConnectedPeers
            peerIds={peerIds}
            dataChannelStates={dataChannelStates}
            transferProgress={transferProgress}
            transfersInProgress={transfersInProgress}
          />
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {linkGenerated ? (
                <QRCodeGenerator initialValue={shareLink} />
              ) : (
                <p className="text-center text-muted-foreground">
                  Generate a share link first to create a QR code.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
