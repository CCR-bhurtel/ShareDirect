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

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(http.DefaultServeMux)

	// Start the server
	http.ListenAndServe(":"+config.GetPort(), handler)
}
