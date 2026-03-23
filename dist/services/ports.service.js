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
exports.getportsOperations = exports.addPortOperation = void 0;
const database_1 = require("firebase/database");
const socketHandler_1 = require("../sockets/socketHandler");
const { ref, get, query, orderByChild, equalTo, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const addPortOperation = (_a) => __awaiter(void 0, [_a], void 0, function* ({ executorName, operationType, note, }) {
    try {
        const date = new Date().toISOString().split("T")[0];
        const dbRef = ref(database, "user");
        const searchQuery = query(dbRef, orderByChild("username"), equalTo(executorName));
        const snapshot = yield get(searchQuery);
        if (!snapshot.exists()) {
            return { error: "User not found" };
        }
        const userId = Object.keys(snapshot.val())[0];
        const userOperationsRef = ref(database, `user/${userId}/operationsCount/${operationType}`);
        yield (0, database_1.runTransaction)(userOperationsRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });
        const portLogData = {
            executorName,
            operationType,
            note: note || "",
            timestamp: Date.now(),
            isoTime: new Date().toISOString(),
        };
        const operationLogsRef = ref(database, `operationsLogs/${date}`);
        const newLogRef = yield push(operationLogsRef);
        yield set(newLogRef, portLogData);
        try {
            (0, socketHandler_1.emitToUser)("reactUser", "sendPortLog", portLogData);
        }
        catch (e) {
            console.warn("Socket emit failed, continuing...", e);
        }
        return { message: "Operation count updated safely" };
    }
    catch (error) {
        console.error("Firebase Transaction Error:", error);
        return { error: "Failed to update operation count" };
    }
});
exports.addPortOperation = addPortOperation;
const getportsOperations = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* ({ fromDate, toDate, executorName, } = {}) {
    try {
        const operationLogsRef = ref(database, "operationsLogs");
        const snapshot = yield get(operationLogsRef);
        if (!snapshot.exists()) {
            return [];
        }
        const logs = snapshot.val();
        const result = [];
        Object.keys(logs).forEach((dateKey) => {
            const isAfterFromDate = !fromDate || dateKey >= fromDate;
            const isBeforeToDate = !toDate || dateKey <= toDate;
            if (!isAfterFromDate || !isBeforeToDate) {
                return;
            }
            const dayLogs = logs[dateKey] || {};
            Object.keys(dayLogs).forEach((logId) => {
                const log = dayLogs[logId];
                if (executorName && log.executorName !== executorName) {
                    return;
                }
                result.push(Object.assign({ id: logId, dateKey }, log));
            });
        });
        result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return result;
    }
    catch (error) {
        console.error("getportsOperations error:", error);
        throw new Error("Failed to fetch ports operations");
    }
});
exports.getportsOperations = getportsOperations;
