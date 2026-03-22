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
exports.getEmployeesDashboard = exports.addMofadale = exports.getDailyBalance = exports.getEmployeeBalanceTable = exports.getTotalBalance = exports.getTotalDayBalance = void 0;
const { ref, get, child, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const getTotalDayBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = req.query.date || new Date().toISOString().split("T")[0];
        const dbRef = ref(database);
        let result = [];
        const snapshot = yield get(child(dbRef, `dailyTotal/${date}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            result = Object.entries(data).map(([userId, operations]) => {
                const entries = Object.values(operations);
                let userTotal = 0;
                let userCount = 0;
                entries.forEach((op) => {
                    userTotal += Number(op.amount) || 0;
                    userCount += 1;
                });
                return {
                    id: userId,
                    count: userCount,
                    total: userTotal
                };
            });
        }
        else {
            console.log(`No data available for date: ${date}`);
        }
        res.status(200).json({
            success: true,
            BalanceTable: result
        });
    }
    catch (error) {
        console.error("Error fetching daily total balance:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب البيانات",
            error: error.message
        });
    }
});
exports.getTotalDayBalance = getTotalDayBalance;
const getTotalBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // نص البحث في التاريخ: ممكن يكون سنة فقط "2025-06" أو سنة-شهر-يوم "2025-06-16"
        const dateSubstring = req.query.date ? String(req.query.date) : new Date().toISOString().split("T")[0].slice(0, 7);
        // خذنا أول 7 حروف بشكل افتراضي (مثلاً 2025-06) لو ما أعطى المستخدم تاريخ
        const dbRef = ref(database, 'dailyTotal');
        const snapshot = yield get(dbRef);
        if (!snapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "لا توجد بيانات"
            });
        }
        const data = snapshot.val(); // هذا كائن يحتوي مفاتيح التواريخ (مثل 2025-06-16)
        // فلترة المفاتيح التي تحتوي substring التاريخ
        const filteredEntries = Object.entries(data).filter(([key, value]) => key.includes(dateSubstring));
        // ممكن تجمع النتائج حسب حاجتك، هنا أرسلهم كما هم
        const result = Object.fromEntries(filteredEntries);
        res.status(200).json({
            success: true,
            BalanceTable: result
        });
    }
    catch (error) {
        console.error("Error fetching daily total balance:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب البيانات",
            error: error.message
        });
    }
});
exports.getTotalBalance = getTotalBalance;
const getEmployeeBalanceTable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = String(req.query.username || "");
        const date = String(req.query.date || "");
        if (!username || !date) {
            return res.status(400).json({ success: false, message: "username and date are required." });
        }
        const dbRef = ref(database);
        let invoiceList = [];
        if (username !== "all") {
            const snapshot = yield get(child(dbRef, `dailyTotal/${date}/${username}`));
            if (snapshot.exists()) {
                const data = snapshot.val();
                invoiceList = Object.keys(data).map(key => (Object.assign({ id: key }, data[key])));
            }
        }
        else {
            const snapshot = yield get(child(dbRef, `dailyTotal/${date}`));
            if (snapshot.exists()) {
                const data = snapshot.val();
                invoiceList = Object.keys(data).flatMap(emp => Object.keys(data[emp] || {}).map(key => (Object.assign({ employee: emp, id: key }, data[emp][key]))));
            }
        }
        return res.json({ success: true, data: invoiceList });
    }
    catch (error) {
        console.error("Error fetching employee balance table:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
exports.getEmployeeBalanceTable = getEmployeeBalanceTable;
const getDailyBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbRef = ref(database);
    try {
        const snapshot = yield get(child(dbRef, `dailyBalance`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const balanceList = Object.values(data); // تحويل البيانات إلى قائمة
            return res.status(200).json(balanceList);
        }
        else {
            console.log("لا توجد بيانات متاحة في dailyBalance.");
            return res.status(404).json({ message: "لا توجد بيانات متاحة." });
        }
    }
    catch (error) {
        console.error("حدث خطأ أثناء جلب بيانات الأرصدة:", error.message);
        return res.status(500).json({ error: "فشل في جلب بيانات الأرصدة." });
    }
});
exports.getDailyBalance = getDailyBalance;
const addMofadale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscribersRef = ref(database, "mofadale");
        const newRef = push(subscribersRef);
        const newMofadale = req.body;
        yield set(newRef, newMofadale);
        res.status(200).json({
            success: true,
            message: "تم إضافة المشترك بنجاح ✅",
            id: newRef.key,
            data: newMofadale,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء الإضافة ❌",
            error: error.message,
        });
    }
});
exports.addMofadale = addMofadale;
const getEmployeesDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = String(req.query.date || new Date().toISOString().split("T")[0]);
        const search = String(req.query.search || "")
            .trim()
            .toLowerCase();
        const dbRef = ref(database);
        const snapshot = yield get(child(dbRef, `dailyTotal/${date}`));
        if (!snapshot.exists()) {
            return res.status(200).json({
                success: true,
                date,
                kpis: {
                    topEmployee: null,
                    totalAmount: 0,
                    totalOperations: 0,
                    employeesActive: 0,
                },
                employeesSummary: [],
                employeesOperations: [],
            });
        }
        const data = snapshot.val();
        const summaryMap = {};
        const operations = [];
        Object.entries(data).forEach(([employeeKey, employeeOperations]) => {
            const ops = Object.values(employeeOperations || {});
            let employeeTotal = 0;
            let employeeCount = 0;
            ops.forEach((op) => {
                var _a, _b, _c, _d;
                const amount = Number(op === null || op === void 0 ? void 0 : op.amount) || 0;
                const detailsObject = (op === null || op === void 0 ? void 0 : op.details) || {};
                const customerDetails = (detailsObject === null || detailsObject === void 0 ? void 0 : detailsObject.customerDetails) || "";
                const customerName = (detailsObject === null || detailsObject === void 0 ? void 0 : detailsObject.customerName) || "";
                const customerNumber = ((_b = (_a = detailsObject === null || detailsObject === void 0 ? void 0 : detailsObject.customerNumber) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || "";
                const invoiceNumber = ((_d = (_c = detailsObject === null || detailsObject === void 0 ? void 0 : detailsObject.invoiceNumber) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) || "";
                const detailsText = customerDetails ||
                    customerName ||
                    (typeof (op === null || op === void 0 ? void 0 : op.details) === "string" ? op.details : "");
                const operation = {
                    id: (op === null || op === void 0 ? void 0 : op.id) || null,
                    employee: (op === null || op === void 0 ? void 0 : op.employee) || employeeKey,
                    amount,
                    details: detailsText,
                    timestamp: (op === null || op === void 0 ? void 0 : op.timestamp) || null,
                    customerName,
                    customerNumber,
                    invoiceNumber,
                };
                const searchable = [
                    operation.employee,
                    detailsText,
                    customerName,
                    customerNumber,
                    invoiceNumber,
                ]
                    .join(" ")
                    .toLowerCase();
                if (!search || searchable.includes(search)) {
                    operations.push(operation);
                    employeeTotal += amount;
                    employeeCount += 1;
                }
            });
            if (employeeCount > 0) {
                summaryMap[employeeKey] = {
                    employee: employeeKey,
                    operations: employeeCount,
                    total: employeeTotal,
                };
            }
        });
        const employeesSummary = Object.values(summaryMap).sort((a, b) => b.total - a.total);
        const employeesOperations = operations.sort((a, b) => {
            const tA = new Date(a.timestamp || 0).getTime();
            const tB = new Date(b.timestamp || 0).getTime();
            return tB - tA;
        });
        const totalAmount = employeesSummary.reduce((sum, row) => sum + row.total, 0);
        const totalOperations = employeesSummary.reduce((sum, row) => sum + row.operations, 0);
        const employeesActive = employeesSummary.length;
        const topEmployee = employeesSummary[0] || null;
        return res.status(200).json({
            success: true,
            date,
            kpis: {
                topEmployee,
                totalAmount,
                totalOperations,
                employeesActive,
            },
            employeesSummary,
            employeesOperations,
        });
    }
    catch (error) {
        console.error("Error fetching employees dashboard:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch employees dashboard data",
            error: error.message,
        });
    }
});
exports.getEmployeesDashboard = getEmployeesDashboard;
