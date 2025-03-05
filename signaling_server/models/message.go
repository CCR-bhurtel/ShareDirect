package models

type Message struct {
	Action    string `json:"action"`
	SessionID string `json:"session_id"`
	Candidate string `json:"candidate,omitempty"`
	TargetId  string `json:"target"`
	SDP       string `json:"sdp,omitempty"`
}
