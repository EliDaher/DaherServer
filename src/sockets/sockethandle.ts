import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";

const app = express();
const server = http.createServer(app);

interface ClientsMap {
  [key: string]: string; 
}

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const clients: ClientsMap = {};

io.on("connection", (socket: Socket) => {
  console.log("📌 عميل متصل:", socket.id);

  socket.on("register", (name: string) => {
    clients[name] = socket.id;
    console.log(`✅ سجل العميل "${name}" بـ ID: ${socket.id}`);
  });

  socket.on("json_message", (data: { target: string; [key: string]: any }) => {
    const target = data.target;
    if (clients[target]) {
      io.to(clients[target]).emit("json_message", data);
      console.log(`📤 أرسلنا رسالة إلى ${target}:`, data);
    } else {
      console.log(`⚠️ العميل ${target} غير متصل`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ عميل قطع الاتصال:", socket.id);
    for (const name in clients) {
      if (clients[name] === socket.id) {
        delete clients[name];
        break;
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 السيرفر يعمل على http://localhost:5000");
});
