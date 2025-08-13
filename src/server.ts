import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./sockets/socketHandler";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 5000;

// أنشئ HTTP server بناءً على app
const server = http.createServer(app);

// إنشاء Socket.IO
const io = new Server(server, {
  cors: { origin: "*" },
});

// ربط Socket.IO مع الأحداث
socketHandler(io);

// تشغيل السيرفر على البورت
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
