import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./sockets/socketHandler";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

socketHandler(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
