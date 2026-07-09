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
exports.getEmployeesDashboard = exports.addMofadale = exports.updateElectricityTransactionReviewed = exports.getElectricityTransactions = exports.getBillCategoryTotals = exports.addBillInvoice = exports.getDailyBalance = exports.getEmployeeBalanceTable = exports.getTotalBalance = exports.getTotalDayBalance = void 0;
const { ref, get, child, push, set, update, runTransaction } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const BILL_CATEGORY_LABELS = {
    internetTotal: "إنترنت",
    elecTotal: "كهرباء",
    waterTotal: "مياه",
    phoneTotal: "أرضي",
};
const BILL_CATEGORY_KEYS = Object.keys(BILL_CATEGORY_LABELS);
const BILL_TRANSACTION_PATHS = {
    elecTotal: "billElectricityTransactions",
    phoneTotal: "billPhoneTransactions",
};
function toNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}
function normalizeCategoryTotals(value) {
    return {
        internetTotal: toNumber(value === null || value === void 0 ? void 0 : value.internetTotal),
        elecTotal: toNumber(value === null || value === void 0 ? void 0 : value.elecTotal),
        waterTotal: toNumber(value === null || value === void 0 ? void 0 : value.waterTotal),
        phoneTotal: toNumber(value === null || value === void 0 ? void 0 : value.phoneTotal),
    };
}
function sumCategoryTotals(totals) {
    return BILL_CATEGORY_KEYS.reduce((sum, key) => sum + totals[key], 0);
}
function emptyCategoryTotals() {
    return {
        internetTotal: 0,
        elecTotal: 0,
        waterTotal: 0,
        phoneTotal: 0,
    };
}
function isBillCategoryKey(value) {
    return BILL_CATEGORY_KEYS.includes(value);
}
function isBillTransactionCategory(value) {
    return value === "elecTotal" || value === "phoneTotal";
}
function getBillTransactionCategory(value) {
    return isBillTransactionCategory(value) ? value : "elecTotal";
}
function getBillTransactionPath(category) {
    return BILL_TRANSACTION_PATHS[category];
}
function getBillTransactionLabel(category) {
    return category === "phoneTotal" ? "Phone" : "Electricity";
}
function normalizeInvoiceDetail(value) {
    const category = isBillCategoryKey(value === null || value === void 0 ? void 0 : value.category) ? value.category : undefined;
    return Object.assign(Object.assign({}, value), (category ? { category } : {}));
}
function toReviewedBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        return value === "true" || value === "reviewed" || value === "1";
    }
    return Boolean(value);
}
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
const addBillInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const employee = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.employee) || "").trim();
        const details = Array.isArray((_b = req.body) === null || _b === void 0 ? void 0 : _b.details)
            ? req.body.details.map(normalizeInvoiceDetail)
            : [];
        const categoryTotals = normalizeCategoryTotals((_c = req.body) === null || _c === void 0 ? void 0 : _c.categoryTotals);
        const amount = sumCategoryTotals(categoryTotals);
        const date = new Date().toISOString().split("T")[0];
        const now = new Date().toISOString();
        if (!employee) {
            return res.status(400).json({
                success: false,
                message: "employee is required.",
            });
        }
        // if (amount <= 0) {
        //   return res.status(400).json({
        //     success: false,
        //     message: "categoryTotals must include a positive amount.",
        //   });
        // }
        const invoiceRef = push(ref(database, `dailyTotal/${date}/${employee}`));
        const operation = {
            id: invoiceRef.key,
            amount,
            categoryTotals,
            details,
            employee,
            timestamp: date,
            createdAt: now,
        };
        yield set(invoiceRef, operation);
        const transactionCategories = [
            "elecTotal",
            "phoneTotal",
        ];
        yield Promise.all(transactionCategories.flatMap((category) => details
            .filter((detail) => detail.category === category)
            .map((detail) => {
            const transactionRef = push(ref(database, `${getBillTransactionPath(category)}/${date}`));
            const transaction = {
                id: transactionRef.key,
                invoiceId: invoiceRef.key,
                employee,
                date,
                createdAt: now,
                reviewed: false,
                category,
                customerName: detail.customerName || "",
                customerNumber: detail.customerNumber || "",
                customerDetails: detail.customerDetails || "",
                invoiceNumber: detail.invoiceNumber || "",
                invoiceValue: toNumber(detail.invoiceValue),
            };
            return set(transactionRef, transaction);
        })));
        const summaryRef = ref(database, `billCategoryTotals/${date}/${employee}`);
        yield runTransaction(summaryRef, (currentSummary) => {
            const previousTotals = normalizeCategoryTotals(currentSummary);
            const nextTotals = BILL_CATEGORY_KEYS.reduce((acc, key) => (Object.assign(Object.assign({}, acc), { [key]: previousTotals[key] + categoryTotals[key] })), emptyCategoryTotals());
            return Object.assign(Object.assign(Object.assign({}, currentSummary), nextTotals), { date,
                employee, total: sumCategoryTotals(nextTotals), operationCount: toNumber(currentSummary === null || currentSummary === void 0 ? void 0 : currentSummary.operationCount) + 1, updatedAt: now });
        });
        return res.status(200).json({
            success: true,
            message: "Bill invoice added successfully.",
            id: invoiceRef.key,
            data: operation,
        });
    }
    catch (error) {
        console.error("Error adding bill invoice:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add bill invoice.",
            error: error.message,
        });
    }
});
exports.addBillInvoice = addBillInvoice;
const getBillCategoryTotals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = String(req.query.date || new Date().toISOString().split("T")[0]);
        const employeeFilter = String(req.query.employee || "all").trim();
        const categoryFilter = String(req.query.category || "all").trim();
        const snapshot = yield get(child(ref(database), `billCategoryTotals/${date}`));
        const rows = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([employee, value]) => (Object.assign(Object.assign({ employee }, normalizeCategoryTotals(value)), { total: toNumber(value === null || value === void 0 ? void 0 : value.total) || sumCategoryTotals(normalizeCategoryTotals(value)), operationCount: toNumber(value === null || value === void 0 ? void 0 : value.operationCount), updatedAt: (value === null || value === void 0 ? void 0 : value.updatedAt) || null })))
            : [];
        const filteredRows = employeeFilter && employeeFilter !== "all"
            ? rows.filter((row) => row.employee === employeeFilter)
            : rows;
        const totals = filteredRows.reduce((acc, row) => {
            BILL_CATEGORY_KEYS.forEach((key) => {
                acc[key] += row[key];
            });
            return acc;
        }, emptyCategoryTotals());
        const byEmployee = filteredRows.map((row) => ({
            employee: row.employee,
            internetTotal: categoryFilter === "all" || categoryFilter === "internetTotal" ? row.internetTotal : 0,
            elecTotal: categoryFilter === "all" || categoryFilter === "elecTotal" ? row.elecTotal : 0,
            waterTotal: categoryFilter === "all" || categoryFilter === "waterTotal" ? row.waterTotal : 0,
            phoneTotal: categoryFilter === "all" || categoryFilter === "phoneTotal" ? row.phoneTotal : 0,
            total: categoryFilter === "all"
                ? row.total
                : toNumber(row[categoryFilter]),
        }));
        const byCategory = BILL_CATEGORY_KEYS.map((key) => ({
            category: key,
            label: BILL_CATEGORY_LABELS[key],
            total: totals[key],
        })).filter((row) => categoryFilter === "all" || row.category === categoryFilter);
        const filteredTotals = categoryFilter === "all"
            ? Object.assign(Object.assign({}, totals), { total: sumCategoryTotals(totals) }) : Object.assign(Object.assign({}, emptyCategoryTotals()), { [categoryFilter]: toNumber(totals[categoryFilter]), total: toNumber(totals[categoryFilter]) });
        return res.status(200).json({
            success: true,
            date,
            totals: filteredTotals,
            byEmployee,
            byCategory,
        });
    }
    catch (error) {
        console.error("Error fetching bill category totals:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch bill category totals.",
            error: error.message,
        });
    }
});
exports.getBillCategoryTotals = getBillCategoryTotals;
const getElectricityTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = String(req.query.date || new Date().toISOString().split("T")[0]);
        const employeeFilter = String(req.query.employee || "all").trim();
        const reviewedFilter = String(req.query.reviewed || "all").trim();
        const category = getBillTransactionCategory(req.query.category);
        const snapshot = yield get(child(ref(database), `${getBillTransactionPath(category)}/${date}`));
        const rows = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, value]) => (Object.assign(Object.assign({ id }, value), { reviewed: Boolean(value === null || value === void 0 ? void 0 : value.reviewed) })))
            : [];
        const filteredRows = rows
            .filter((row) => employeeFilter && employeeFilter !== "all"
            ? row.employee === employeeFilter
            : true)
            .filter((row) => reviewedFilter && reviewedFilter !== "all"
            ? row.reviewed === toReviewedBoolean(reviewedFilter)
            : true)
            .sort((a, b) => {
            const aTime = new Date(a.createdAt || 0).getTime();
            const bTime = new Date(b.createdAt || 0).getTime();
            return bTime - aTime;
        });
        return res.status(200).json({
            success: true,
            date,
            category,
            data: filteredRows,
        });
    }
    catch (error) {
        console.error("Error fetching bill transactions:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch bill transactions.",
            error: error.message,
        });
    }
});
exports.getElectricityTransactions = getElectricityTransactions;
const updateElectricityTransactionReviewed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const id = String(req.params.id || "").trim();
        const date = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.date) || "").trim();
        const reviewed = toReviewedBoolean((_b = req.body) === null || _b === void 0 ? void 0 : _b.reviewed);
        const category = getBillTransactionCategory((_c = req.body) === null || _c === void 0 ? void 0 : _c.category);
        const transactionLabel = getBillTransactionLabel(category);
        const now = new Date().toISOString();
        if (!id || !date) {
            return res.status(400).json({
                success: false,
                message: "id and date are required.",
            });
        }
        const transactionRef = ref(database, `${getBillTransactionPath(category)}/${date}/${id}`);
        const snapshot = yield get(transactionRef);
        if (!snapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: `${transactionLabel} transaction not found.`,
            });
        }
        yield update(transactionRef, {
            reviewed,
            reviewedAt: now,
        });
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, snapshot.val()), { id,
                reviewed, reviewedAt: now, category }),
        });
    }
    catch (error) {
        console.error("Error updating bill transaction:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update bill transaction.",
            error: error.message,
        });
    }
});
exports.updateElectricityTransactionReviewed = updateElectricityTransactionReviewed;
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
