// server/socket.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Heroku에서는 환경 변수로 포트가 제공됩니다.
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: "*",  // 모든 출처에서의 요청을 허용
    methods: ["GET", "POST"],
  },
});

// 방 정보를 저장할 Map 객체
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // 사용자가 방에 참여할 때 실행
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(userId);
    console.log(`User ${userId} joined room: ${roomId}`);
    socket.to(roomId).emit("user-connected", userId);
  });

  // WebRTC offer 이벤트 처리
  socket.on("offer", (targetUserId, offer) => {
    console.log(`Relaying offer from ${socket.id} to ${targetUserId}`);
    socket.to(targetUserId).emit("offer", socket.id, offer);
  });

  // WebRTC answer 이벤트 처리
  socket.on("answer", (targetUserId, answer) => {
    console.log(`Relaying answer from ${socket.id} to ${targetUserId}`);
    socket.to(targetUserId).emit("answer", socket.id, answer);
  });

  // ICE candidate 이벤트 처리
  socket.on("ice-candidate", (targetUserId, candidate) => {
    console.log(`Relaying ICE candidate from ${socket.id} to ${targetUserId}`);
    socket.to(targetUserId).emit("ice-candidate", socket.id, candidate);
  });

  // 사용자가 방을 떠날 때 처리
  socket.on("leave-room", (roomId, userId) => {
    handleUserLeave(socket, roomId, userId);
  });

  // 사용자가 연결을 끊었을 때 처리
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        handleUserLeave(socket, roomId, socket.id);
      }
    });
  });
});

// 사용자가 방을 떠날 때 호출되는 함수
function handleUserLeave(socket, roomId, userId) {
  socket.leave(roomId);
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(userId);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }
  console.log(`User ${userId} left room: ${roomId}`);
  socket.to(roomId).emit("user-disconnected", userId);
}

// 서버를 시작하여 포트에서 대기
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
