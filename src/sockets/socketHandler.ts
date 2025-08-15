import { Server, Socket } from "socket.io";

const clients: Record<string, string> = {};

export function socketHandler(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("📌 Client connected:", socket.id);

    socket.on("register", (name: string) => {
      clients[name] = socket.id;
      console.log(`✅ ${name} registered with id: ${socket.id}`);
    });

    socket.on("json_message", (data) => {
      const target = data.target;
      if (clients[target]) {
        io.to(clients[target]).emit("json_message", data);
      } else {
        console.log(`⚠️ Client ${target} not connected`);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
      for (const name in clients) {
        if (clients[name] === socket.id) {
          delete clients[name];
        }
      }
    });
  });
}
