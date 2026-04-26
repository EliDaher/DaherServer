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
exports.deleteReportedTransaction = exports.createReportedTransaction = exports.getReportedTransactions = void 0;
const { ref, get, push, set, remove } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
function toRequiredString(value) {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim();
}
function buildMatchKey(number, company) {
    return `${number.trim()}::${company.trim().toLowerCase()}`;
}
function mapSnapshotToRecords(value) {
    if (!value) {
        return [];
    }
    return Object.entries(value).map(([id, record]) => ({
        id,
        number: String((record === null || record === void 0 ? void 0 : record.number) || ""),
        company: String((record === null || record === void 0 ? void 0 : record.company) || ""),
        note: typeof (record === null || record === void 0 ? void 0 : record.note) === "string" && record.note.trim()
            ? record.note.trim()
            : undefined,
        createdAt: String((record === null || record === void 0 ? void 0 : record.createdAt) || ""),
        createdBy: typeof (record === null || record === void 0 ? void 0 : record.createdBy) === "string" && record.createdBy.trim()
            ? record.createdBy.trim()
            : undefined,
    }));
}
const getReportedTransactions = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield get(ref(database, "reportedTransactions"));
        const records = mapSnapshotToRecords(snapshot.exists() ? snapshot.val() : null);
        records.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return res.status(200).json({
            success: true,
            data: records,
        });
    }
    catch (error) {
        console.error("Error fetching reported transactions:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reported transactions",
        });
    }
});
exports.getReportedTransactions = getReportedTransactions;
const createReportedTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const number = toRequiredString((_a = req.body) === null || _a === void 0 ? void 0 : _a.number);
        const company = toRequiredString((_b = req.body) === null || _b === void 0 ? void 0 : _b.company);
        const note = toRequiredString((_c = req.body) === null || _c === void 0 ? void 0 : _c.note);
        const createdBy = toRequiredString((_d = req.body) === null || _d === void 0 ? void 0 : _d.createdBy);
        if (!number || !company) {
            return res.status(400).json({
                success: false,
                message: "number and company are required",
            });
        }
        const rootRef = ref(database, "reportedTransactions");
        const snapshot = yield get(rootRef);
        const existingRecords = mapSnapshotToRecords(snapshot.exists() ? snapshot.val() : null);
        const incomingKey = buildMatchKey(number, company);
        const duplicate = existingRecords.some((record) => buildMatchKey(record.number, record.company) === incomingKey);
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "Reported transaction already exists",
            });
        }
        const newRecordRef = push(rootRef);
        const id = newRecordRef.key;
        const record = Object.assign(Object.assign(Object.assign({ id,
            number,
            company }, (note ? { note } : {})), { createdAt: new Date().toISOString() }), (createdBy ? { createdBy } : {}));
        yield set(newRecordRef, record);
        return res.status(201).json({
            success: true,
            data: record,
        });
    }
    catch (error) {
        console.error("Error creating reported transaction:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create reported transaction",
        });
    }
});
exports.createReportedTransaction = createReportedTransaction;
const deleteReportedTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = toRequiredString((_a = req.params) === null || _a === void 0 ? void 0 : _a.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "id is required",
            });
        }
        yield remove(ref(database, `reportedTransactions/${id}`));
        return res.status(200).json({
            success: true,
            message: "Reported transaction deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting reported transaction:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete reported transaction",
        });
    }
});
exports.deleteReportedTransaction = deleteReportedTransaction;
