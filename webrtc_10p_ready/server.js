// 10-person WebRTC (mesh) + Socket.io signaling, serves static frontend from /public
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_, res) => res.json({ ok: true }));

// roomId -> Set(socketId)
const rooms = new Map();

io.on("connection", (socket) => {
  let joinedRoom = null;

  socket.on("join", ({ roomId, name }) => {
    if (!roomId || typeof roomId !== "string") return;
    joinedRoom = roomId.trim();

    if (!rooms.has(joinedRoom)) rooms.set(joinedRoom, new Set());
    const members = rooms.get(joinedRoom);
    const peers = Array.from(members);
    members.add(socket.id);
    socket.join(joinedRoom);

    // newcomer gets list of current peers
    socket.emit("peers", { peers });

    // others are notified
    socket.to(joinedRoom).emit("peer-joined", { id: socket.id, name: name || "Guest" });
  });

  // Relay SDP/ICE between peers
  socket.on("offer", ({ to, sdp }) => io.to(to).emit("offer", { from: socket.id, sdp }));
  socket.on("answer", ({ to, sdp }) => io.to(to).emit("answer", { from: socket.id, sdp }));
  socket.on("ice-candidate", ({ to, candidate }) => io.to(to).emit("ice-candidate", { from: socket.id, candidate }));

  socket.on("disconnect", () => {
    if (!joinedRoom) return;
    const set = rooms.get(joinedRoom);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) rooms.delete(joinedRoom);
    }
    socket.to(joinedRoom).emit("peer-left", { id: socket.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
