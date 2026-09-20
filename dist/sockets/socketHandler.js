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
const pendingStateRequests = {};
let globalIo;
const pendingInquiryRequests = {};
const getInquiryKey = (email) => email.trim().toLowerCase();
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const getInquiryContent = (data) => asObject(data === null || data === void 0 ? void 0 : data.content);
const getInquiryDetails = (data) => {
    const content = getInquiryContent(data);
    return {
        email: String(content.email || "").trim(),
        selectedCompany: String(content.selectedCompany || content.company || "").trim(),
        landline: String(content.landline || content.number || "").trim(),
    };
};
const getResponseRequestId = (data) => {
    const content = getInquiryContent(data);
    const responseData = content.data;
    if (content.requestId)
        return String(content.requestId);
    if (responseData && typeof responseData === "object" && responseData.requestId) {
        return String(responseData.requestId);
    }
    return "";
};
const buildResultMessage = (data) => {
    var _a;
    const content = getInquiryContent(data);
    const responseData = (_a = content.data) !== null && _a !== void 0 ? _a : content;
    if (typeof responseData === "string")
        return `Sent payment result: ${responseData}`;
    try {
        return `Sent payment result: ${JSON.stringify(responseData)}`;
    }
    catch (_b) {
        return "Sent payment result: [unserializable response]";
    }
};
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
        socket.on("json_message", (data) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const target = data.target;
            const content = getInquiryContent(data);
            const sender = String(content.email || "unknown").trim();
            if (!target) {
                console.log("No target specified in message:", data);
                return;
            }
            if (target === "worker") {
                const { email, selectedCompany, landline } = getInquiryDetails(data);
                const inquiryEmail = email || sender;
                const inquiryKey = getInquiryKey(inquiryEmail);
                const requestId = String(content.requestId || (0, uuid_1.v4)());
                const workerSocketId = clients["worker"];
                const senderSocketId = clients[inquiryEmail] || clients[sender] || socket.id;
                const forwardedContent = Object.assign(Object.assign({}, content), { email: inquiryEmail, requestId });
                const forwardedData = Object.assign(Object.assign({}, data), { content: forwardedContent });
                if (pendingInquiryRequests[inquiryKey]) {
                    delete pendingInquiryRequests[inquiryKey];
                }
                try {
                    yield createLog({
                        type: "message",
                        from: inquiryEmail,
                        target: "worker",
                        message: `Received inquiry request for ${landline || "-"} in ${selectedCompany || "-"}`,
                        data: {
                            email: inquiryEmail,
                            requestId,
                            selectedCompany,
                            landline,
                            content: forwardedContent,
                        },
                    });
                }
                catch (error) {
                    console.error("Error creating inquiry request log:", error);
                }
                if (!workerSocketId) {
                    const errorResponse = {
                        requestId,
                        email: inquiryEmail,
                        selectedCompany,
                        landline,
                        error: "خادم الاستعلام غير متصل حاليًا، الرجاء إعادة المحاولة الآن",
                    };
                    io.to(senderSocketId).emit("json_message", {
                        content: {
                            requestId,
                            email: inquiryEmail,
                            data: errorResponse,
                        },
                    });
                    try {
                        yield createLog({
                            type: "message",
                            from: "server",
                            target: inquiryEmail,
                            message: `Sent payment result: ${JSON.stringify(errorResponse)}`,
                            data: errorResponse,
                        });
                    }
                    catch (error) {
                        console.error("Error creating inquiry worker offline log:", error);
                    }
                    return;
                }
                pendingInquiryRequests[inquiryKey] = {
                    requestId,
                    socketId: senderSocketId,
                    email: inquiryEmail,
                    selectedCompany,
                    landline,
                    startedAt: Date.now(),
                };
                io.to(workerSocketId).emit("json_message", forwardedData);
                return;
            }
            else {
                const inquiryKey = getInquiryKey(String(target));
                const pendingInquiry = pendingInquiryRequests[inquiryKey];
                const responseRequestId = getResponseRequestId(data);
                if (pendingInquiry &&
                    responseRequestId &&
                    responseRequestId !== pendingInquiry.requestId) {
                    console.log(`Ignoring stale inquiry response for ${target}. Expected ${pendingInquiry.requestId}, received ${responseRequestId}`);
                    return;
                }
                if (pendingInquiry) {
                    delete pendingInquiryRequests[inquiryKey];
                }
                const responseContent = getInquiryContent(data);
                const responseData = responseContent.data;
                const enrichedResponseData = responseData && typeof responseData === "object" && !Array.isArray(responseData)
                    ? Object.assign(Object.assign({}, responseData), { requestId: responseRequestId || (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.requestId), email: responseData.email || target, selectedCompany: responseData.selectedCompany || (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.selectedCompany), landline: responseData.landline || (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.landline) }) : responseData;
                const enrichedData = Object.assign(Object.assign({}, data), { content: Object.assign(Object.assign({}, responseContent), { requestId: responseRequestId || (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.requestId), email: responseContent.email || target, data: enrichedResponseData }) });
                try {
                    yield createLog({
                        type: "message",
                        from: data.from || "worker",
                        target,
                        message: buildResultMessage(enrichedData),
                        data: {
                            email: target,
                            requestId: responseRequestId || (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.requestId),
                            selectedCompany: (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.selectedCompany) || "",
                            landline: (pendingInquiry === null || pendingInquiry === void 0 ? void 0 : pendingInquiry.landline) || "",
                            content: enrichedData.content,
                        },
                    });
                }
                catch (error) {
                    console.error("Error creating inquiry response log:", error);
                }
                if (clients[target]) {
                    (_a = io.to(clients[target])) === null || _a === void 0 ? void 0 : _a.emit("json_message", enrichedData);
                }
                else {
                    console.log(`Client ${target} not connected`);
                }
            }
        }));
        socket.on("disconnect", () => __awaiter(this, void 0, void 0, function* () {
            console.log("Client disconnected:", socket.id);
            for (const requestId in pendingStateRequests) {
                if (pendingStateRequests[requestId] === socket.id) {
                    delete pendingStateRequests[requestId];
                }
            }
            for (const email in pendingInquiryRequests) {
                if (pendingInquiryRequests[email].socketId === socket.id) {
                    delete pendingInquiryRequests[email];
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
