"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = void 0;
exports.socketHandler = socketHandler;
const database_1 = require("firebase/database");
const uuid_1 = require("uuid");
const { database } = require("../../firebaseConfig.js");
const clients = {};
const waitingList = {};
const pendingStateRequests = {};
let globalIo;
const emitToUser = (username, event, data) => {
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
exports.emitToUser = emitToUser;
function normalizeStatePayload(data, forceDisabled) {
    var _a, _b;
    let parsed = data;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        }
        catch (_c) {
            parsed = {};
        }
    }
    const payload = Array.isArray(parsed) ? { usernames: parsed } : parsed || {};
    const requestId = payload.requestId || (0, uuid_1.v4)();
    const usernames = Array.isArray(payload.usernames)
        ? payload.usernames
        : Array.isArray(payload.users)
            ? payload.users
            : Array.isArray(payload.ppp_users)
                ? payload.ppp_users
                : [];
    const desiredDisabledRaw = forceDisabled !== undefined
        ? forceDisabled
        : (_b = (_a = payload.desired_disabled) !== null && _a !== void 0 ? _a : payload.disabled) !== null && _b !== void 0 ? _b : true;
    return {
        requestId,
        usernames,
        desired_disabled: Boolean(desiredDisabledRaw),
    };
}
function buildStateError(requestId, message) {
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
function emitStateResultToRequester(io, eventName, data) {
    const requestId = data === null || data === void 0 ? void 0 : data.requestId;
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
function socketHandler(io) {
    globalIo = io;
    io.on("connection", (socket) => {
        function createLog(_a) {
            return __awaiter(this, arguments, void 0, function* ({ type, from, target, message, data, }) {
                const id = (0, uuid_1.v4)();
                const now = new Date();
                const time = now.toLocaleTimeString("en-EG", {
                    hour12: true,
                    timeZone: "Asia/Damascus",
                });
                const date = now.toLocaleDateString("en-CA", {
                    timeZone: "Asia/Damascus",
                });
                const dbRef = (0, database_1.ref)(database, `astalamatLogs/${date}/${id}`);
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
                yield (0, database_1.set)(dbRef, log);
                io.emit("createLog", log);
            });
        }
        function forwardStateRequest({ input, workerEvent, resultEvent, forceDisabled, }) {
            const workerSocketId = clients["PPPworker"];
            const payload = normalizeStatePayload(input, forceDisabled);
            if (!Array.isArray(payload.usernames) || payload.usernames.length === 0) {
                socket.emit(resultEvent, buildStateError(payload.requestId, "Missing usernames list."));
                return;
            }
            if (!workerSocketId) {
                console.log("Worker client not connected");
                socket.emit(resultEvent, buildStateError(payload.requestId, "PPP worker is not connected."));
                return;
            }
            pendingStateRequests[payload.requestId] = socket.id;
            io.to(workerSocketId).emit(workerEvent, payload);
        }
        console.log("Client connected:", socket.id);
        socket.on("register", (name) => __awaiter(this, void 0, void 0, function* () {
            clients[name] = socket.id;
            console.log(`${name} registered with id: ${socket.id}`);
            try {
                yield createLog({
                    type: "register",
                    from: name,
                    target: "server",
                    message: `Socket ID ${socket.id}, with name ${name} connected`,
                });
            }
            catch (error) {
                console.error("Error creating log for register:", error);
            }
        }));
        socket.on("getActive", () => {
            console.log("Received getActive from client:", socket.id);
            const workerSocketId = clients["PPPworker"];
            if (workerSocketId) {
                io.to(workerSocketId).emit("getActive");
            }
            else {
                console.log("Worker client not connected");
            }
        });
        socket.on("getInterface", (data) => {
            console.log("Received getInterface from client:", data);
            const workerSocketId = clients["PPPworker"];
            if (workerSocketId) {
                io.to(workerSocketId).emit("getInterface", data);
            }
            else {
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
        socket.on("createLog", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield createLog({
                    type: data.type,
                    from: data.from,
                    target: data.target,
                    message: data.message,
                    data: data.data || null,
                });
            }
            catch (error) {
                console.error("Error creating log from socket event:", error);
            }
        }));
        socket.on("json_message", (data) => {
            var _a, _b, _c;
            const target = data.target;
            const sender = ((_a = data === null || data === void 0 ? void 0 : data.content) === null || _a === void 0 ? void 0 : _a.email) || "unknown";
            if (!target) {
                console.log("No target specified in message:", data);
                return;
            }
            if (target === "worker") {
                if (waitingList[sender]) {
                    const message = `There is already a pending request for ${sender}. Please try again later.`;
                    (_b = io.to(clients[sender])) === null || _b === void 0 ? void 0 : _b.emit("json_message", {
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
            }
            else {
                delete waitingList[target];
            }
            if (clients[target]) {
                (_c = io.to(clients[target])) === null || _c === void 0 ? void 0 : _c.emit("json_message", data);
            }
            else {
                console.log(`Client ${target} not connected`);
            }
        });
        socket.on("disconnect", () => __awaiter(this, void 0, void 0, function* () {
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
                        yield createLog({
                            type: "disconnect",
                            from: name,
                            target: "server",
                            message: `Socket ID ${socket.id}, with name ${name} disconnected`,
                        });
                    }
                    catch (e) {
                        console.error("Error creating log for disconnect:", e);
                    }
                    break;
                }
            }
        }));
    });
}
