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
exports.createPosProfitLog = exports.getPosProfitLogs = void 0;
const { ref, get, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const PROFIT_RATE = 0.05;
function toPositiveNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }
    return numeric;
}
function toOptionalString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function toDateKey(value) {
    if (typeof value !== "string")
        return null;
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return null;
    }
    return normalized;
}
function toLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return 200;
    return Math.min(Math.floor(parsed), 2000);
}
const getPosProfitLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const fromDate = toDateKey((_a = req.query) === null || _a === void 0 ? void 0 : _a.fromDate);
        const toDate = toDateKey((_b = req.query) === null || _b === void 0 ? void 0 : _b.toDate);
        const limit = toLimit((_c = req.query) === null || _c === void 0 ? void 0 : _c.limit);
        if ((((_d = req.query) === null || _d === void 0 ? void 0 : _d.fromDate) && !fromDate) || (((_e = req.query) === null || _e === void 0 ? void 0 : _e.toDate) && !toDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Expected YYYY-MM-DD",
            });
        }
        if (fromDate && toDate && fromDate > toDate) {
            return res.status(400).json({
                success: false,
                message: "fromDate cannot be greater than toDate",
            });
        }
        const rootRef = ref(database, "profitLogs/posInvoices");
        const snapshot = yield get(rootRef);
        if (!snapshot.exists()) {
            const payload = {
                logs: [],
                summary: {
                    totalProfitAmount: 0,
                    totalAmount: 0,
                    count: 0,
                },
            };
            return res.status(200).json({
                success: true,
                data: payload,
            });
        }
        const logsByDate = snapshot.val();
        const allFilteredLogs = [];
        Object.keys(logsByDate).forEach((dateKey) => {
            if (fromDate && dateKey < fromDate)
                return;
            if (toDate && dateKey > toDate)
                return;
            const dayLogs = logsByDate[dateKey] || {};
            Object.keys(dayLogs).forEach((logId) => {
                const raw = dayLogs[logId] || {};
                const operationState = toOptionalString(raw.operationState);
                if (operationState !== "تم التسديد") {
                    return;
                }
                const amount = Number(raw.amount || 0);
                const profitAmount = Number(raw.profitAmount || 0);
                allFilteredLogs.push({
                    id: String(raw.id || logId),
                    invoiceId: String(raw.invoiceId || ""),
                    amount,
                    profitRate: Number(raw.profitRate || PROFIT_RATE),
                    profitAmount,
                    company: toOptionalString(raw.company),
                    email: toOptionalString(raw.email),
                    number: toOptionalString(raw.number),
                    operator: toOptionalString(raw.operator),
                    source: "pending_transactions",
                    operationState: "تم التسديد",
                    createdAt: String(raw.createdAt || `${dateKey}T00:00:00.000Z`),
                    dateKey: String(raw.dateKey || dateKey),
                });
            });
        });
        const totalProfitAmount = allFilteredLogs.reduce((sum, item) => sum + Number(item.profitAmount || 0), 0);
        const totalAmount = allFilteredLogs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const sortedLogs = [...allFilteredLogs].sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        const payload = {
            logs: sortedLogs.slice(0, limit),
            summary: {
                totalProfitAmount,
                totalAmount,
                count: allFilteredLogs.length,
            },
        };
        return res.status(200).json({
            success: true,
            data: payload,
        });
    }
    catch (error) {
        console.error("Error fetching POS profit logs:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch POS profit logs",
        });
    }
});
exports.getPosProfitLogs = getPosProfitLogs;
const createPosProfitLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const invoiceId = toOptionalString((_a = req.body) === null || _a === void 0 ? void 0 : _a.invoiceId);
        const amount = toPositiveNumber((_b = req.body) === null || _b === void 0 ? void 0 : _b.amount);
        const source = (_c = req.body) === null || _c === void 0 ? void 0 : _c.source;
        if (!invoiceId) {
            return res.status(400).json({
                success: false,
                message: "invoiceId is required",
            });
        }
        if (amount === null) {
            return res.status(400).json({
                success: false,
                message: "amount must be a positive number",
            });
        }
        if (source !== "pending_transactions") {
            return res.status(400).json({
                success: false,
                message: 'source must be "pending_transactions"',
            });
        }
        const operationState = toOptionalString((_d = req.body) === null || _d === void 0 ? void 0 : _d.operationState);
        if (operationState !== "تم التسديد") {
            return res.status(400).json({
                success: false,
                message: 'operationState must be "تم التسديد"',
            });
        }
        const createdAt = new Date().toISOString();
        const dateKey = createdAt.split("T")[0];
        const profitAmount = Number((amount * PROFIT_RATE).toFixed(2));
        const logsRef = ref(database, `profitLogs/posInvoices/${dateKey}`);
        const newLogRef = push(logsRef);
        const id = newLogRef.key;
        const record = {
            id,
            invoiceId,
            amount,
            profitRate: PROFIT_RATE,
            profitAmount,
            company: toOptionalString((_e = req.body) === null || _e === void 0 ? void 0 : _e.company),
            email: toOptionalString((_f = req.body) === null || _f === void 0 ? void 0 : _f.email),
            number: toOptionalString((_g = req.body) === null || _g === void 0 ? void 0 : _g.number),
            operator: toOptionalString((_h = req.body) === null || _h === void 0 ? void 0 : _h.operator),
            source,
            operationState: "تم التسديد",
            createdAt,
            dateKey,
        };
        yield set(newLogRef, record);
        return res.status(201).json({
            success: true,
            data: record,
        });
    }
    catch (error) {
        console.error("Error creating POS profit log:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create POS profit log",
        });
    }
});
exports.createPosProfitLog = createPosProfitLog;
