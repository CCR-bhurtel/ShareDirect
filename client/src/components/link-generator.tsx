"use client"

import { useState } from "react"
import { Check, Copy, Share, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LinkGeneratorProps {
  shareLink: string
  onShowQR: () => void
}

export default function LinkGenerator({ shareLink, onShowQR }: LinkGeneratorProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const shareViaNavigator = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ShareDirect File",
          text: "Download my file using this secure link:",
          url: shareLink,
        })
      } catch (err) {
        console.error("Error sharing: ", err)
      }
    } else {
      copyToClipboard()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-2 mb-2">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-xl font-bold">Your file is ready to share!</h3>
        <p className="text-muted-foreground">
          Use the link below to share your file. The recipient will be able to download it directly from your device.
        </p>
      </div>

      <div className="flex space-x-2">
        <Input value={shareLink} readOnly className="font-mono text-sm" />
        <Button variant="outline" size="icon" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={onShowQR}>
          <QrCode className="h-4 w-4" />
        </Button>
      </div>

      <div className="pt-4">
        <Button className="w-full" onClick={shareViaNavigator}>
          <Share className="mr-2 h-4 w-4" />
          Share Link
        </Button>
      </div>

      <div className="rounded-lg bg-muted p-4 text-sm">
        <p className="font-medium mb-1">Link Settings:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Expires in 24 hours</li>
          <li>• Limited to 1 download</li>
          <li>• No password protection</li>
        </ul>
      </div>
    </div>
  )
}

