"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Laptop, Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectedPeersProps {
  peerIds: string[];
  dataChannelStates: Record<string, { isReady: boolean; isOpen: boolean }>;
  transferProgress?: Record<string, number>;
  transfersInProgress?: string[];
  className?: string;
}

export default function ConnectedPeers({
  peerIds,
  dataChannelStates,
  transferProgress = {},
  transfersInProgress = [],
  className,
}: ConnectedPeersProps) {
  const [animateNewPeer, setAnimateNewPeer] = useState<string | null>(null);

  // Track when new peers connect to animate them
  useEffect(() => {
    const lastPeerId = peerIds.length > 0 ? peerIds[peerIds.length - 1] : null;
    if (lastPeerId && !animateNewPeer) {
      setAnimateNewPeer(lastPeerId);
      const timer = setTimeout(() => {
        setAnimateNewPeer(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [peerIds, animateNewPeer]);

  if (peerIds.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connected Peers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <WifiOff className="h-10 w-10 mb-2 opacity-50" />
            <p>No peers connected</p>
            <p className="text-sm mt-1">Waiting for connections...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connected Peers
          </CardTitle>
          <Badge variant="outline" className="ml-2">
            {peerIds.length} {peerIds.length === 1 ? "peer" : "peers"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {peerIds.map((peerId) => {
            const isConnected = dataChannelStates[peerId]?.isOpen;
            const isTransferring = transfersInProgress.includes(peerId);
            const progress = transferProgress[peerId] || 0;

            return (
              <li
                key={peerId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md border",
                  isConnected
                    ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900"
                    : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900",
                  animateNewPeer === peerId && "animate-pulse"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      isConnected
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-yellow-100 dark:bg-yellow-900/30"
                    )}
                  >
                    {isConnected ? (
                      <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Laptop className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1">
                      Peer {peerId.substring(0, 8)}...
                      {isTransferring && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Transferring {progress}%
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isConnected
                        ? "Connected and ready for transfer"
                        : "Connection established, waiting for data channel"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={isConnected ? "success" : "outline"}
                  className={cn(
                    "ml-2",
                    !isConnected && "text-yellow-600 dark:text-yellow-400"
                  )}
                >
                  {isConnected ? "Ready" : "Connecting"}
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
