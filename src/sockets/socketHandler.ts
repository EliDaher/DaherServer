import { Server, Socket } from "socket.io";
import { ref, set } from "firebase/database";
const { database } = require("../../firebaseConfig.js");
import { v4 as uuid } from "uuid";

const clients: Record<string, string> = {};
const waitingList: Record<string, string> = {};



export async function createLog({ type, from, target, message, data } : { type: string; from: string; target: string; message: string; data?: any }) {
  const date = new Date().toISOString().split("T")[0];
  const id = uuid();

  const dbRef = ref(database, `astalamatLogs/${date}/${id}`);

  await set(dbRef, {
    id,
    type,
    from,
    target,
    message,
    data: data || null,
    date: new Date().toISOString().split("T")[0], // 2025-02-15
    time: new Date().toLocaleTimeString("ar-EG", { hour12: false }), // HH:MM:SS
    timestamp: Date.now(),
  });
}


export function socketHandler(io: Server) {
  io.on("connection", (socket: Socket) => {
    
    console.log("📌 Client connected:", socket.id);

    socket.on("register", async (name: string) => {
      clients[name] = socket.id;
      console.log(`✅ ${name} registered with id: ${socket.id}`);
      try {
        await createLog({
          type: "register",
          from: name,
          target: "server",
          message: `Socket ID ${socket.id}, with name ${name} connected`,
        })
      } catch (error) {
        console.error("Error creating log for register:", error);
      }
    });

    socket.on("createLog", async (data) => {
      try {
        await createLog({
          type: data.type,
          from: data.from,
          target: data.target,
          message: data.message,
          data: data.data || null,
        })
      } catch (error) {
        console.error("Error creating log from socket event:", error);
      }
      // {
      //     "from": email,
      //     "target": "server",
      //     "content": f"Received payment request for {sub_number} from {company}",
      //     "timestamp": int(time.time()),
      // }
    });

    socket.on("json_message", (data) => {
      const target = data.target;
      const sender = data?.content?.email;
      if (!target) {
        console.log("⚠️ No target specified in message:", data);
        return;
      }
      if (!sender) {
        console.log("⚠️ No sender email specified in message content:", data);
        return;
      }

      if (target == 'worker') {
        if (waitingList[sender]) {
          console.log(`هناك طلب موجود من المستخدم ${sender} الرجاء اعادة المحاولة لاحقاً`);
          io.to(clients[sender])?.emit("json_message", {
            content: { data: {'حدث حطأ': `هناك طلب موجود من المستخدم ${sender} الرجاء اعادة المحاولة لاحقاً`} }
          });
          delete waitingList[sender];
          return;
        } else {
          waitingList[sender] = 'waiting';
        }
      } else {
        delete waitingList[target];
      }

      if (clients[target]) {
        io.to(clients[target])?.emit("json_message", data);
      } else {
        console.log(`⚠️ Client ${target} not connected`);
      }
    });

    socket.on("disconnect", async () => {

      console.log("❌ Client disconnected:", socket.id);

      
      for (const name in clients) {
        if (clients[name] === socket.id) {
          delete clients[name];
          try {
            await createLog({
              type: "disconnect",
              from: name,
              target: "server",
              message: `Socket ID ${socket.id}, with name ${name} disconnected`,
            });
          } catch (e) {
            console.error("Error creating log for disconnect:", e);
          }
          break;
        }
      }

    });
  });
}
