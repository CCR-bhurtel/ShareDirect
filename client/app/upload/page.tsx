"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Hash, Lock } from "lucide-react";
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
import { useWebRTC } from "@/hooks/useWebRTC";
import { SIGNALING_SERVER } from "@/config/keys";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [expirationHours, setExpirationHours] = useState(24);
  const [downloadLimit, setDownloadLimit] = useState(1);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");

  const { sessionId, sendFile, createSession, dataChannel } =
    useWebRTC(SIGNALING_SERVER);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  useEffect(() => {
    if (dataChannel.isReady && dataChannel.isOpen && file) {
      sendFile(file);
    }
  }, [dataChannel, file, sendFile]);

  const handleUpload = () => {
    if (!file) return;

    createSession();

    setIsUploading(true);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);

        // Generate a mock unique ID for the file
      }
    }, 200);
  };

  useEffect(() => {
    if (sessionId) {
      const generatedLink = `${window.location.origin}/download/${sessionId}`;
      setShareLink(generatedLink);
      setLinkGenerated(true);
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

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2  md:grid-cols-3 ">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="options" disabled={!file}>
            Sharing Options
          </TabsTrigger>
          <TabsTrigger value="qr" disabled={!linkGenerated} id="qr-tab">
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
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="expiration">Link Expiration</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {expirationHours} {expirationHours === 1 ? "hour" : "hours"}
                  </span>
                </div>
                <Slider
                  id="expiration"
                  min={1}
                  max={72}
                  step={1}
                  value={[expirationHours]}
                  onValueChange={(value) => setExpirationHours(value[0])}
                />
              </div>

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
