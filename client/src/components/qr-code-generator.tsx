"use client"

import type React from "react"
import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface QRCodeGeneratorProps {
  initialValue: string
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ initialValue }) => {
  const [qrValue, setQrValue] = useState(initialValue)
  const [size, setSize] = useState(256)
  const [color, setColor] = useState("#000000")

  const downloadQR = () => {
    const svg = document.getElementById("qr-code")
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()
      img.onload = () => {
        canvas.width = size
        canvas.height = size
        ctx?.drawImage(img, 0, 0)
        const pngFile = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.download = "qr-code.png"
        downloadLink.href = pngFile
        downloadLink.click()
      }
      img.src = "data:image/svg+xml;base64," + btoa(svgData)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="qr-value">QR Code Content</Label>
        <Input
          id="qr-value"
          value={qrValue}
          onChange={(e) => setQrValue(e.target.value)}
          placeholder="Enter text or URL for QR code"
        />
      </div>

      <div>
        <Label htmlFor="qr-size">QR Code Size</Label>
        <Slider id="qr-size" min={128} max={512} step={8} value={[size]} onValueChange={(value) => setSize(value[0])} />
        <span className="text-sm text-muted-foreground">{size}px</span>
      </div>

      <div>
        <Label htmlFor="qr-color">QR Code Color</Label>
        <Input id="qr-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>

      <div className="flex justify-center">
        <QRCodeSVG id="qr-code" value={qrValue} size={size} fgColor={color} level="H" includeMargin={true} />
      </div>

      <Button onClick={downloadQR} className="w-full">
        Download QR Code
      </Button>
    </div>
  )
}

export default QRCodeGenerator

