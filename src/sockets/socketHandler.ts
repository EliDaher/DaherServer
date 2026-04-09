import { Server, Socket } from "socket.io";
import { ref, set } from "firebase/database";
import { v4 as uuid } from "uuid";

const { database } = require("../../firebaseConfig.js");

const clients: Record<string, string> = {};
const waitingList: Record<string, string> = {};
const pendingStateRequests: Record<string, string> = {};

let globalIo: Server;

export const emitToUser = (username: string, event: string, data: any) => {
  if (!globalIo) {
    console.warn("Socket.IO not initialized");
    return;
  }

  const socketId = clients[username];
  if (!socketId) {
    console.warn(`User ${username} not connected`);
    return;
  }

  globalIo.to(socketId).emit(event, data);
};

function normalizeStatePayload(data: any, forceDisabled?: boolean) {
  let parsed = data;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }

  const payload = Array.isArray(parsed) ? { usernames: parsed } : parsed || {};

  const requestId = payload.requestId || uuid();
  const usernames = Array.isArray(payload.usernames)
    ? payload.usernames
    : Array.isArray(payload.users)
    ? payload.users
    : Array.isArray(payload.ppp_users)
    ? payload.ppp_users
    : [];

  const desiredDisabledRaw =
    forceDisabled !== undefined
      ? forceDisabled
      : payload.desired_disabled ?? payload.disabled ?? true;

  return {
    requestId,
    usernames,
    desired_disabled: Boolean(desiredDisabledRaw),
  };
}

function buildStateError(requestId: string, message: string) {
  return {
    ok: false,
    requestId,
    message,
    requested_count: 0,
    success_count: 0,
    failed_count: 0,
    results: [],
  };
}

function emitStateResultToRequester(io: Server, eventName: string, data: any) {
  const requestId = data?.requestId;
  const targetSocketId = requestId ? pendingStateRequests[requestId] : undefined;

  if (targetSocketId) {
    io.to(targetSocketId).emit(eventName, data);
    delete pendingStateRequests[requestId];
    return;
  }

  const reactSocketId = clients["reactUser"];
  if (reactSocketId) {
    io.to(reactSocketId).emit(eventName, data);
  }
}

export function socketHandler(io: Server) {
  globalIo = io;

  io.on("connection", (socket: Socket) => {
    async function createLog({
      type,
      from,
      target,
      message,
      data,
    }: {
      type: string;
      from: string;
      target: string;
      message: string;
      data?: any;
    }) {
      const id = uuid();

      const now = new Date();

      const time = now.toLocaleTimeString("en-EG", {
        hour12: true,
        timeZone: "Asia/Damascus",
      });

      const date = now.toLocaleDateString("en-CA", {
        timeZone: "Asia/Damascus",
      });

      const dbRef = ref(database, `astalamatLogs/${date}/${id}`);
      const log = {
        id,
        type,
        from,
        target,
        message,
        data: data || null,
        date,
        time,
        timestamp: Date.now(),
      };

      await set(dbRef, log);
      io.emit("createLog", log);
    }

    function forwardStateRequest({
      input,
      workerEvent,
      resultEvent,
      forceDisabled,
    }: {
      input: any;
      workerEvent: "disablePPPUsers" | "setPPPUsersState";
      resultEvent: "disablePPPUsersResult" | "setPPPUsersStateResult";
      forceDisabled?: boolean;
    }) {
      const workerSocketId = clients["PPPworker"];
      const payload = normalizeStatePayload(input, forceDisabled);

      if (!Array.isArray(payload.usernames) || payload.usernames.length === 0) {
        socket.emit(resultEvent, buildStateError(payload.requestId, "Missing usernames list."));
        return;
      }

      if (!workerSocketId) {
        console.log("Worker client not connected");
        socket.emit(
          resultEvent,
          buildStateError(payload.requestId, "PPP worker is not connected.")
        );
        return;
      }

      pendingStateRequests[payload.requestId] = socket.id;
      io.to(workerSocketId).emit(workerEvent, payload);
    }

    console.log("Client connected:", socket.id);

    socket.on("register", async (name: string) => {
      clients[name] = socket.id;
      console.log(`${name} registered with id: ${socket.id}`);

      try {
        await createLog({
          type: "register",
          from: name,
          target: "server",
          message: `Socket ID ${socket.id}, with name ${name} connected`,
        });
      } catch (error) {
        console.error("Error creating log for register:", error);
      }
    });

    socket.on("getActive", () => {
      console.log("Received getActive from client:", socket.id);

      const workerSocketId = clients["PPPworker"];
      if (workerSocketId) {
        io.to(workerSocketId).emit("getActive");
      } else {
        console.log("Worker client not connected");
      }
    });

    socket.on("getInterface", (data) => {
      console.log("Received getInterface from client:", data);

      const workerSocketId = clients["PPPworker"];
      if (workerSocketId) {
        io.to(workerSocketId).emit("getInterface", data);
      } else {
        console.log("Worker client not connected");
      }
    });

    socket.on("sendToDeactivate", (data) => {
      console.log("Received sendToDeactivate from client:", data);
      forwardStateRequest({
        input: data,
        workerEvent: "disablePPPUsers",
        resultEvent: "disablePPPUsersResult",
        forceDisabled: true,
      });
    });

    socket.on("disablePPPUsers", (data) => {
      console.log("Received disablePPPUsers from client:", data);
      forwardStateRequest({
        input: data,
        workerEvent: "disablePPPUsers",
        resultEvent: "disablePPPUsersResult",
        forceDisabled: true,
      });
    });

    socket.on("setPPPUsersState", (data) => {
      console.log("Received setPPPUsersState from client:", data);
      forwardStateRequest({
        input: data,
        workerEvent: "setPPPUsersState",
        resultEvent: "setPPPUsersStateResult",
      });
    });

    socket.on("disablePPPUsersResult", (data) => {
      console.log("Received disablePPPUsersResult from worker:", data);
      emitStateResultToRequester(io, "disablePPPUsersResult", data);
    });

    socket.on("setPPPUsersStateResult", (data) => {
      console.log("Received setPPPUsersStateResult from worker:", data);
      emitStateResultToRequester(io, "setPPPUsersStateResult", data);
    });

    socket.on("returnActivePPP", (data) => {
      console.log("Received ActivePPP from worker:", data);

      const reactSocketId = clients["reactUser"];
      if (reactSocketId) {
        io.to(reactSocketId).emit("returnActivePPP", data);
      }
    });

    socket.on("sendPortLog", (data) => {
      console.log("Received sendPortLog from worker:", data);

      const reactSocketId = clients["reactUser"];
      if (reactSocketId) {
        io.to(reactSocketId).emit("sendPortLog", data);
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
        });
      } catch (error) {
        console.error("Error creating log from socket event:", error);
      }
    });

    socket.on("json_message", (data) => {
      const target = data.target;
      const sender = data?.content?.email || "unknown";
      if (!target) {
        console.log("No target specified in message:", data);
        return;
      }

      if (target === "worker") {
        if (waitingList[sender]) {
          const message = `There is already a pending request for ${sender}. Please try again later.`;
          io.to(clients[sender])?.emit("json_message", {
            content: {
              data: {
                error: message,
              },
            },
          });
          delete waitingList[sender];
          return;
        }
        waitingList[sender] = "waiting";
      } else {
        delete waitingList[target];
      }

      if (clients[target]) {
        io.to(clients[target])?.emit("json_message", data);
      } else {
        console.log(`Client ${target} not connected`);
      }
    });

    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);

      for (const requestId in pendingStateRequests) {
        if (pendingStateRequests[requestId] === socket.id) {
          delete pendingStateRequests[requestId];
        }
      }

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
