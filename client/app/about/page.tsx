/* eslint-disable react/no-unescaped-entities */
import Link from "next/link"
import { ArrowLeft, Upload, Download, Globe, Server, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container max-w-4xl py-12 mx-4 px-4 lg:px-0 lg:mx-auto">
      <Button variant="ghost" asChild className="mb-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">About ShareDirect</h1>
          <p className="text-muted-foreground">
            Learn more about our peer-to-peer file sharing platform and how it
            works.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <p>
            ShareDirect uses WebRTC technology to establish direct connections
            between devices, allowing files to be transferred directly from one
            user to another without going through our servers. This ensures
            maximum privacy and security for your files.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card>
              <CardHeader className="pb-2">
                <Upload className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Step 1: Upload</CardTitle>
                <CardDescription>
                  Select your file and customize sharing options
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Globe className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Step 2: Share</CardTitle>
                <CardDescription>
                  Share the generated link with your recipient
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Download className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Step 3: Download</CardTitle>
                <CardDescription>
                  Recipient downloads directly from your device
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Technical Details</h2>
          <p>
            Our platform leverages modern web technologies to provide a seamless
            and secure file sharing experience:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-primary" />
                  <CardTitle>WebRTC Technology</CardTitle>
                </div>
                <CardDescription>
                  Web Real-Time Communication enables direct browser-to-browser
                  connections without intermediary servers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  WebRTC establishes a secure channel between peers, allowing
                  for efficient data transfer directly between devices. This
                  eliminates the need to upload files to a central server first.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle>End-to-End Encryption</CardTitle>
                </div>
                <CardDescription>
                  All file transfers are encrypted from end to end, ensuring
                  your data remains private.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Files are encrypted before leaving your device and can only be
                  decrypted by the intended recipient. Even if someone
                  intercepts the data, they cannot access the contents.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Privacy & Security</h2>
          <p>
            At ShareDirect, we prioritize your privacy and the security of your
            data:
          </p>

          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li>
              <span className="font-medium">No Storage on Our Servers:</span>{" "}
              Your files are transferred directly between devices and never
              stored on our servers.
            </li>
            <li>
              <span className="font-medium">Temporary Signaling Only:</span> We
              only facilitate the initial connection between peers. Once
              established, the connection is direct.
            </li>
            <li>
              <span className="font-medium">Link Expiration:</span> All sharing
              links automatically expire after a set period, ensuring your files
              aren't accessible indefinitely.
            </li>
            <li>
              <span className="font-medium">Download Limits:</span> You can
              restrict how many times a file can be downloaded, providing
              additional control.
            </li>
            <li>
              <span className="font-medium">Optional Password Protection:</span>{" "}
              Add an extra layer of security by password-protecting your shared
              files.
            </li>
          </ul>
        </div>

        <div className="flex justify-center mt-12">
          <Button asChild size="lg">
            <Link href="/upload">Start Sharing Now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

