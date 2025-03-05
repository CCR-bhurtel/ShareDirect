package main

import (
	"net/http"
	"p2p-signaling-server/config"
	server "p2p-signaling-server/server"
)

func main() {
	// Create a new signaling server
	signalingServer := server.NewSignalingServer()

	// Handle websocket connections
	http.HandleFunc("/ws", signalingServer.HandleWebSocketConnection)

	// Start the server
	http.ListenAndServe(":"+config.GetPort(), nil)
}
