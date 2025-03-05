# WebRTC File Transfer

This project enables peer-to-peer file transfer using WebRTC, with a **Next.js client** and a **Golang signaling server** that communicates over WebSockets.

## Features
- Peer-to-peer file transfer using WebRTC
- WebSockets-based signaling mechanism
- Next.js frontend
- Golang backend for signaling

## Project Structure
```
📂 project-root
├── 📂 client            # Next.js frontend
│   ├── .env            # Environment variables
│   ├── pages/          # Next.js pages
│   ├── components/     # React components
│   └── public/         # Static assets
│
├── 📂 signaling_server  # Go WebSocket signaling server
│   ├── main.go         # Server entry point
│   ├── handlers/       # WebSocket handlers
│   └── utils/          # Helper functions
│
└── README.md           # Project documentation
```

## Environment Variables
### Client (Next.js)
Create a `.env.local` file inside the `client` directory and define the following:
```
NEXT_PUBLIC_SIGNALING_SERVER_URL=ws://localhost:5001/ws
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000
```
- `NEXT_PUBLIC_SIGNALING_SERVER_URL` → WebSocket server for signaling.
- `NEXT_PUBLIC_CLIENT_URL` → The frontend URL.

### Signaling Server (Golang)
Set up environment variables in your Go server or use a `.env` file (if applicable):
```
SIGNALING_SERVER_PORT=5001
```

## Installation & Setup
### Prerequisites
- **Node.js** (for Next.js frontend)
- **Go** (for signaling server)

### 1. Run the Signaling Server
```sh
cd signaling_server
go run main.go
```
By default, the server runs on `ws://localhost:5001/ws`.

### 2. Run the Next.js Client
```sh
cd client
npm install   # Install dependencies
npm run dev   # Start the development server
```
The frontend should now be running on `http://localhost:3000`.

## How It Works
1. The Next.js frontend establishes a WebSocket connection to the signaling server.
2. When a user joins, the signaling server manages peer connections.
3. WebRTC data channels are used to transfer files directly between peers.

## TODOs & Improvements
- [ ] Add authentication for signaling
- [ ] Implement file chunking for large files
- [ ] Enhance UI for better user experience

## License
MIT License

