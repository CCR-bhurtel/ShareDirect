/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"
import { useState } from "react"
import { QrReader } from "react-qr-reader"
import { Button } from "@/components/ui/button"

interface QRCodeScannerProps {
  onScan: (data: string | null) => void
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan }) => {
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = (result: any) => {
    if (result) {
      onScan(result?.text)
      setIsScanning(false)
    }
  }

  // const handleError = (error: any) => {
  //   console.error(error)
  // }

  return (
    <div className="space-y-4">
      {isScanning ? (
        <div className="w-full max-w-sm mx-auto">
          <QrReader
            onResult={handleScan}
            constraints={{ facingMode: "environment" }}
            containerStyle={{ width: "100%" }}
          />
        </div>
      ) : (
        <Button onClick={() => setIsScanning(true)} className="w-full">
          Scan QR Code
        </Button>
      )}
    </div>
  )
}

export default QRCodeScanner

