package server

import (
	"fmt"
	"net/http"

	"p2p-signaling-server/models"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type SignalingServer struct {
}

func NewSignalingServer() *SignalingServer {
	return &SignalingServer{}
}

func (s *SignalingServer) HandleWebSocketConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Println("Error upgrading to websocket connection: ", err)
		return
	}

	connection := RegisterConnection(conn)
	defer RemoveConnection(connection.SessionID)

	// Listen for socket messages
	for {
		var msg models.Message
		err := conn.ReadJSON(&msg)

		if err != nil {
			fmt.Println("Error reading JSON:", err)
			break
		}

		s.handleMessage(connection, msg)
	}
	fmt.Println("Connectin with session ID: ", connection.SessionID, " closed")

}

func (s *SignalingServer) handleMessage(sender *Connection, msg models.Message) {

	switch msg.Action {
	case "create_session":

		s.sendSessionCreated(sender)
	case "join_session":
		s.handleSessionJoin(sender, msg)
	case "offer":
		s.forwardOffer(sender, msg)
	case "answer":
		s.forwardAnswer(sender, msg)
	case "candidate":
		s.forwardCandidate(sender, msg)

	}
}

func (s *SignalingServer) sendSessionCreated(conn *Connection) {

	response := models.Message{
		Action:    "session_created",
		SessionID: conn.SessionID,
	}

	s.sendMessage(conn, response)
}

func (s *SignalingServer) handleSessionJoin(conn *Connection, msg models.Message) {
	targetConn := GetConnection(msg.TargetId)
	if targetConn == nil {
		s.sendError(conn, "File not found, please try again later.")
		return
	}

	fmt.Println("Peer joined session: ", msg.TargetId)

	response := models.Message{
		Action:    "peer_joined",
		SessionID: conn.SessionID,
		TargetId:  msg.TargetId,
	}

	s.sendMessage(targetConn, response)
}

func (s *SignalingServer) forwardOffer(sender *Connection, msg models.Message) {
	fmt.Printf("Forwarding offer %v \n \n ", msg)
	targetConn := GetConnection(msg.TargetId)
	if targetConn == nil {
		s.sendError(sender, "Peer not found, Please try again later.")
		return
	}

	forwardedMsg := models.Message{
		Action:    "offer",
		SessionID: sender.SessionID,
		SDP:       msg.SDP,
		TargetId:  msg.TargetId,
	}

	s.sendMessage(targetConn, forwardedMsg)

}

func (s *SignalingServer) forwardAnswer(sender *Connection, msg models.Message) {
	fmt.Printf("Forwarding answer %v \n \n ", msg)
	targetConn := GetConnection(msg.TargetId)
	if targetConn == nil {
		s.sendError(sender, "Error connecting to peer")
		return
	}

	forwardedMessage := models.Message{
		Action:    "answer",
		SessionID: sender.SessionID,
		SDP:       msg.SDP,
		TargetId:  msg.TargetId,
	}

	s.sendMessage(targetConn, forwardedMessage)
}

func (s *SignalingServer) forwardCandidate(sender *Connection, msg models.Message) {
	fmt.Printf("Forwarding candidate %v \n \n ", msg)
	targetConn := GetConnection(msg.TargetId)
	if targetConn == nil {
		s.sendError(sender, "Error connecting to peer")
		return
	}

	forwardedMessage := models.Message{
		Action:    "candidate",
		SessionID: sender.SessionID,
		Candidate: msg.Candidate,
		TargetId:  msg.TargetId,
	}
	s.sendMessage(targetConn, forwardedMessage)
}

func (s *SignalingServer) sendMessage(conn *Connection, msg models.Message) {
	err := conn.Conn.WriteJSON(msg)
	if err != nil {
		fmt.Println("Failed to send message", err)
	}
}

func (s *SignalingServer) sendError(conn *Connection, errorMsg string) {
	errMessage := models.Message{
		Action: "error",
		SDP:    errorMsg,
	}
	fmt.Println("Error: ", errorMsg)
	s.sendMessage(conn, errMessage)
}
