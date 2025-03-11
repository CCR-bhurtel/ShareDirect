package main

import (
	"net/http"
	server "p2p-signaling-server/server"

	config "p2p-signaling-server/config"

	"github.com/rs/cors"
)

func main() {
	// Create a new signaling server
	signalingServer := server.NewSignalingServer()

	http.HandleFunc("/ws", signalingServer.HandleWebSocketConnection)

	// Start the server
	http.ListenAndServe(":"+config.GetPort(), cors.AllowAll().Handler(http.DefaultServeMux))
}
