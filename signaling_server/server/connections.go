package server

import (
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Connection struct {
	SessionID string
	Conn      *websocket.Conn
}

var (
	connections = make(map[string]*Connection)
	mu          sync.Mutex
)

func RegisterConnection(conn *websocket.Conn) *Connection {
	
	sessionId := generateSessionId()
	connection := &Connection{
		SessionID: sessionId,
		Conn:      conn,
	}

	mu.Lock()

	connections[sessionId] = connection
	mu.Unlock()

	return connection

}

func RemoveConnection(sessionId string) {
	mu.Lock()
	defer mu.Unlock()
	delete(connections, sessionId)
}

func GetConnection(sessionId string) *Connection {
	mu.Lock()
	defer mu.Unlock()
	return connections[sessionId]
}

func generateSessionId() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
