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
exports.getLogsByDate = exports.getAllCompaniesBalances = exports.increaseBalance = exports.decreaseBalance = exports.createCompany = void 0;
const ports_controller_1 = require("./ports.controller");
const { ref, get, child, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const createCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, initialBalance, balanceLimit } = req.body;
        const companiesRef = ref(database, 'companies');
        const newCompanyRef = push(companiesRef);
        const newCompanyData = {
            name,
            balance: initialBalance || 0,
            createdAt: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            id: newCompanyRef.key,
            balanceLimit
        };
        yield set(newCompanyRef, newCompanyData);
        res.status(201).json({ message: "Company created successfully", success: true });
    }
    catch (error) {
        console.error("Error creating company:", error);
        res.status(500).json({ error: "Failed to create company" });
    }
});
exports.createCompany = createCompany;
const decreaseBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, reason, company, number, companyId, port } = req.body;
        const date = new Date().toISOString().split("T")[0];
        if (companyId != '') {
            const companiesRef = ref(database, `companies/${companyId}`);
            const snapshot = yield get(companiesRef);
            if (!snapshot.exists()) {
                return res.status(404).json({ error: "Company not found" });
            }
            const companyData = snapshot.val();
            const currentBalance = companyData.balance || 0;
            const newBalance = currentBalance - amount;
            yield set(companiesRef, Object.assign(Object.assign({}, companyData), { balance: newBalance, lastUpdate: new Date().toISOString() }));
            console.log({
                type: "decrease",
                amount,
                reason,
                company,
                companyId,
                number,
                port,
                beforeBalance: companyData.balance,
                afterBalance: newBalance,
                date: new Date().toISOString(),
            });
            const balanceLogsRef = ref(database, `balanceLogs/${date}`);
            const newLogRef = push(balanceLogsRef);
            yield set(newLogRef, {
                type: "decrease",
                amount,
                reason,
                company,
                companyId,
                number,
                port,
                beforeBalance: companyData.balance,
                afterBalance: newBalance,
                date: new Date().toISOString(),
            });
        }
        (0, ports_controller_1.addPortOprationInternal)({
            executorName: port,
            operationType: 'POSInvoice',
            note: `فاتورة انترنت للرقم ${number} في شركة ${company} بقيمة ${amount}`,
        });
        res.status(200).json({ message: "Balance decreased successfully", success: true });
    }
    catch (error) {
        console.error("Error decreasing balance:", error);
        res.status(500).json({ error: "Failed to decrease balance" });
    }
});
exports.decreaseBalance = decreaseBalance;
const increaseBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, reason, company, number, companyId, port, paidAmount, paymentNote } = req.body;
        const date = new Date().toISOString().split("T")[0];
        const companiesRef = ref(database, `companies/${companyId}`);
        const snapshot = yield get(companiesRef);
        if (!snapshot.exists()) {
            return res.status(404).json({ error: "Company not found" });
        }
        const companyData = snapshot.val();
        const currentBalance = companyData.balance || 0;
        const newBalance = currentBalance + amount;
        yield set(companiesRef, Object.assign(Object.assign({}, companyData), { balance: newBalance, lastUpdate: new Date().toISOString() }));
        const balanceLogsRef = ref(database, `balanceLogs/${date}`);
        const newLogRef = push(balanceLogsRef);
        yield set(newLogRef, {
            type: "increase",
            amount,
            reason,
            company,
            number,
            port,
            beforeBalance: companyData.balance,
            afterBalance: newBalance,
            date: new Date().toISOString(),
        });
        if (paidAmount && paidAmount > 0) {
            const InvoiceRef = ref(database, `dailyTotal/${date}/mahal`);
            const newInvoiceRef = push(InvoiceRef);
            yield set(newInvoiceRef, {
                amount: Number(-paidAmount),
                details: {
                    customerDetails: paymentNote || "هرم رصيد",
                    customerName: port || "mahal",
                    customerNumber: "0",
                    invoiceNumber: "0",
                    invoiceValue: Number(-paidAmount),
                },
                employee: port || "mahal",
                timestamp: date,
            });
        }
        (0, ports_controller_1.addPortOprationInternal)({
            executorName: port,
            operationType: "CompanyIncrease",
            note: `زيادة رصيد في شركة ${company} بقيمة ${amount}`,
        });
        res
            .status(200)
            .json({ message: "Balance increased successfully", success: true });
    }
    catch (error) {
        console.error("Error increasing balance:", error);
        res.status(500).json({ error: "Failed to increase balance" });
    }
});
exports.increaseBalance = increaseBalance;
const getAllCompaniesBalances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companiesRef = ref(database, 'companies');
        const snapshot = yield get(companiesRef);
        if (!snapshot.exists()) {
            return res.status(404).json({ error: "No companies found" });
        }
        const companies = snapshot.val();
        res.status(200).json({ companies });
    }
    catch (error) {
        console.error("Error fetching company balances:", error);
        res.status(500).json({ error: "Failed to fetch company balances" });
    }
});
exports.getAllCompaniesBalances = getAllCompaniesBalances;
const getLogsByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromDate, toDate } = req.query;
        if (!fromDate || !toDate) {
            return res
                .status(400)
                .json({ error: "fromDate and toDate are required" });
        }
        const logsRef = ref(database, `balanceLogs`);
        const snapshot = yield get(logsRef);
        if (!snapshot.exists()) {
            return res.status(404).json({ error: "No logs found" });
        }
        const logs = snapshot.val();
        const result = [];
        Object.keys(logs).forEach((dateKey) => {
            if (dateKey >= fromDate && dateKey <= toDate) {
                const dayLogs = logs[dateKey];
                Object.keys(dayLogs).forEach((logId) => {
                    result.push(Object.assign({ id: logId, dateKey }, dayLogs[logId]));
                });
            }
        });
        res.status(200).json({
            count: result.length,
            logs: result,
        });
    }
    catch (error) {
        console.error("Error fetching company logs:", error);
        res.status(500).json({ error: "Failed to fetch company logs" });
    }
});
exports.getLogsByDate = getLogsByDate;
