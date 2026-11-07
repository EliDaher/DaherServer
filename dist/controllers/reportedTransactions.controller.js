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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReportedTransaction = exports.getReportedTransactionHistory = exports.updateReportedTransaction = exports.createReportedTransaction = exports.getReportedTransactions = void 0;
const reportedTransactions_1 = require("../services/reportedTransactions");
const { ref, get, push, runTransaction } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
function failure(res, error) {
    if (error instanceof reportedTransactions_1.ReportError)
        return res.status(error.status).json({ success: false, message: error.message });
    console.error("Reported transaction error:", error);
    return res.status(500).json({ success: false, message: "Failed to save or load reported transaction" });
}
const getReportedTransactions = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield get(ref(database, "reportedTransactions"));
        const data = Object.entries(snapshot.val() || {}).map(([id, record]) => {
            const _a = (0, reportedTransactions_1.normalizeReport)(id, record), { history } = _a, report = __rest(_a, ["history"]);
            return report;
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return res.json({ success: true, data });
    }
    catch (error) {
        return failure(res, error);
    }
});
exports.getReportedTransactions = getReportedTransactions;
function save(req, res, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const root = ref(database, "reportedTransactions");
            const id = creating ? push(root).key : req.params.id;
            if (!id || /[.#$\[\]\/]/.test(id))
                throw new reportedTransactions_1.ReportError(400, "Invalid report id");
            const eventId = push(root).key;
            const timestamp = new Date().toISOString();
            yield get(root); // Prime the transaction cache before validating existing records.
            const result = yield runTransaction(root, (records) => {
                return (0, reportedTransactions_1.applyReportChange)(records || {}, id, req.body || {}, creating, timestamp, eventId);
            }, { applyLocally: false });
            const _a = (0, reportedTransactions_1.normalizeReport)(id, result.snapshot.child(id).val()), { history } = _a, data = __rest(_a, ["history"]);
            return res.status(creating ? 201 : 200).json({ success: true, data });
        }
        catch (error) {
            return failure(res, error);
        }
    });
}
const createReportedTransaction = (req, res) => save(req, res, true);
exports.createReportedTransaction = createReportedTransaction;
const updateReportedTransaction = (req, res) => save(req, res, false);
exports.updateReportedTransaction = updateReportedTransaction;
const getReportedTransactionHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        if (!id || /[.#$\[\]\/]/.test(id))
            throw new reportedTransactions_1.ReportError(400, "Invalid report id");
        const snapshot = yield get(ref(database, `reportedTransactions/${id}`));
        if (!snapshot.exists())
            throw new reportedTransactions_1.ReportError(404, "Report not found");
        const report = (0, reportedTransactions_1.normalizeReport)(id, snapshot.val());
        return res.json({ success: true, data: Object.values(report.history).sort((a, b) => b.at.localeCompare(a.at)) });
    }
    catch (error) {
        return failure(res, error);
    }
});
exports.getReportedTransactionHistory = getReportedTransactionHistory;
const deleteReportedTransaction = (_req, res) => res.status(405).json({ success: false, message: "Reports are preserved. Mark the report done instead." });
exports.deleteReportedTransaction = deleteReportedTransaction;
