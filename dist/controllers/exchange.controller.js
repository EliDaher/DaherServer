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
exports.deleteDoneExchange = exports.getDoneExchange = exports.addDoneExchange = exports.deletePendingExchange = exports.getPendingExchange = exports.addPendingExchange = void 0;
const { ref, set, push, get, child, remove } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const addPendingExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sypAmount, usdAmount, details } = req.body;
        if (!sypAmount || !usdAmount || !details) {
            return res.status(400).json({ error: "Missing or invalid fields" });
        }
        const newExchangeRef = push(ref(database, "exchange/pending"));
        const exchangeID = newExchangeRef.key;
        const formData = {
            id: exchangeID,
            sypAmount,
            usdAmount,
            details,
            timestamp: Date.now(),
        };
        yield set(newExchangeRef, formData);
        res.status(200).json({ success: true, message: "Exchange added successfully" });
    }
    catch (error) {
        console.error("Error adding exchange:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.addPendingExchange = addPendingExchange;
const getPendingExchange = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield get(ref(database, "exchange/pending"));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const pendingList = Object.entries(data).map(([id, value]) => (Object.assign({ id }, value)));
            res.status(200).json({ success: true, pendingList });
        }
        else {
            res.status(200).json({ success: true, pendingList: [] });
        }
    }
    catch (error) {
        console.error("Error getting pending exchanges:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});
exports.getPendingExchange = getPendingExchange;
const deletePendingExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        if (!id)
            return res.status(400).json({ error: "Missing ID" });
        yield remove(ref(database, `exchange/pending/${id}`));
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Error deleting pending exchange:", error);
        res.status(500).json({ error: "Failed to delete data" });
    }
});
exports.deletePendingExchange = deletePendingExchange;
const addDoneExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sypAmount, usdAmount, details, finalSYP, finalUSD } = req.body;
        if (!sypAmount || !usdAmount || !details) {
            return res.status(400).json({ error: "Missing or invalid fields" });
        }
        const newExchangeRef = push(ref(database, "exchange/done"));
        const exchangeID = newExchangeRef.key;
        const formData = {
            id: exchangeID,
            sypAmount,
            usdAmount,
            finalSYP,
            finalUSD,
            details,
            timestamp: Date.now(),
        };
        yield set(newExchangeRef, formData);
        res.status(200).json({ success: true, message: "Exchange added successfully" });
    }
    catch (error) {
        console.error("Error adding done exchange:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.addDoneExchange = addDoneExchange;
const getDoneExchange = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield get(ref(database, "exchange/done"));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const doneList = Object.entries(data).map(([id, value]) => (Object.assign({ id }, value)));
            res.status(200).json({ success: true, doneList });
        }
        else {
            res.status(200).json({ success: true, doneList: [] });
        }
    }
    catch (error) {
        console.error("Error getting done exchanges:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});
exports.getDoneExchange = getDoneExchange;
const deleteDoneExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        if (!id)
            return res.status(400).json({ error: "Missing ID" });
        yield remove(ref(database, `exchange/done/${id}`));
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Error deleting done exchange:", error);
        res.status(500).json({ error: "Failed to delete data" });
    }
});
exports.deleteDoneExchange = deleteDoneExchange;
