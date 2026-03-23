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
exports.createBalanceLog = void 0;
const { ref, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}
const createBalanceLog = (logProps) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date().toISOString();
        const date = now.split("T")[0];
        const balanceLogsRef = ref(database, `balanceLogs/${date}`);
        const newLogRef = push(balanceLogsRef);
        yield set(newLogRef, Object.assign(Object.assign({}, logProps), { date: now }));
        return {
            id: newLogRef.key,
            date: now,
        };
    }
    catch (error) {
        console.error("createBalanceLog error:", error);
        throw new AppError("Failed to create balance log", 500);
    }
});
exports.createBalanceLog = createBalanceLog;
