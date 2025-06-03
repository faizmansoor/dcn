const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Store room information
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join room
  socket.on("join-room", (roomId, userId) => {
    console.log(`User ${userId} joining room ${roomId}`);

    socket.join(roomId);
    socket.userId = userId;
    socket.roomId = roomId;

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId);
    room.add(userId);

    // Notify existing users in the room
    socket.to(roomId).emit("user-joined", userId);

    // Send list of existing users to the new user
    const existingUsers = Array.from(room).filter((id) => id !== userId);
    socket.emit("existing-users", existingUsers);
  });

  // Handle WebRTC signaling
  socket.on("offer", (offer, targetUserId) => {
    console.log(`Offer from ${socket.userId} to ${targetUserId}`);
    socket.to(socket.roomId).emit("offer", offer, socket.userId);
  });

  socket.on("answer", (answer, targetUserId) => {
    console.log(`Answer from ${socket.userId} to ${targetUserId}`);
    socket.to(socket.roomId).emit("answer", answer, socket.userId);
  });

  socket.on("ice-candidate", (candidate, targetUserId) => {
    socket.to(socket.roomId).emit("ice-candidate", candidate, socket.userId);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (socket.roomId && socket.userId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.delete(socket.userId);
        if (room.size === 0) {
          rooms.delete(socket.roomId);
        }
      }

      socket.to(socket.roomId).emit("user-left", socket.userId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.68.53:${PORT}`);
  console.log(`Share the network URL with other devices on your WiFi`);
});
