package main

import (
	"net/http"
	"p2p-signaling-server/config"
	server "p2p-signaling-server/server"

	"github.com/rs/cors"
)

func main() {
	// Create a new signaling server
	signalingServer := server.NewSignalingServer()

	mux := http.NewServeMux()

	// Handle websocket connections
	mux.HandleFunc("/ws", signalingServer.HandleWebSocketConnection)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},

		AllowCredentials: true,
	})

	// Start the server
	http.ListenAndServe(":"+config.GetPort(), c.Handler(mux))
}
