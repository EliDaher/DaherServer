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
exports.searchInvoices = void 0;
const database_1 = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const searchInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { searchValue } = req.body;
    if (!searchValue || !searchValue.toString().trim()) {
        return res.status(400).json({ error: "Search value is required" });
    }
    try {
        const dbRef = (0, database_1.ref)(database, "dailyTotal");
        const snapshot = yield (0, database_1.get)(dbRef);
        if (!snapshot.exists()) {
            return res.status(404).json({ message: "No data found" });
        }
        const results = [];
        const search = searchValue.toString().toLowerCase().trim();
        snapshot.forEach((dateSnap) => {
            const date = dateSnap.key;
            dateSnap.forEach((employeeSnap) => {
                const employee = employeeSnap.key;
                employeeSnap.forEach((invoiceSnap) => {
                    const invoiceData = invoiceSnap.val();
                    if (invoiceData &&
                        invoiceData.details &&
                        typeof invoiceData.details === "object") {
                        Object.values(invoiceData.details).forEach((detail) => {
                            var _a, _b, _c, _d;
                            const name = ((_a = detail.customerName) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                            const details = ((_b = detail.customerDetails) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
                            const number = ((_c = detail.customerNumber) === null || _c === void 0 ? void 0 : _c.toString()) || "";
                            const invoiceNumber = ((_d = detail.invoiceNumber) === null || _d === void 0 ? void 0 : _d.toString()) || "";
                            if (name.includes(search) ||
                                details.includes(search) ||
                                number.includes(search) ||
                                invoiceNumber.includes(search)) {
                                results.push({
                                    date,
                                    employee,
                                    invoiceData, // يحتوي كل التفاصيل بما فيها details وamount وtimestamp
                                });
                            }
                        });
                    }
                });
            });
        });
        if (results.length === 0) {
            return res.status(404).json({ message: "No matching data found" });
        }
        return res.json(results);
    }
    catch (error) {
        console.error("Error searching invoices:", error);
        return res.status(500).json({ error: error.message });
    }
});
exports.searchInvoices = searchInvoices;
