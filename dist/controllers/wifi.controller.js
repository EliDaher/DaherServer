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
exports.addWifiExpenses = exports.verifyBalances = exports.verifyAndFixBalances = exports.getBalance = exports.createMonthlyInvoices = exports.addInvoice = exports.addPayment = exports.deleteCustomer = exports.updateCustomer = exports.getTransactionsForCustomer = exports.getCustomerById = exports.addCustomers = exports.getCustomers = void 0;
const { ref, get, child, orderByChild, query, equalTo, update, set, push, remove, } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const MONTHLY_INVOICE_TIMEZONE = "Asia/Damascus";
function getMonthlyInvoicePeriod(monthInput, yearInput) {
    const [currentYear, currentMonth] = new Date()
        .toLocaleDateString("en-CA", { timeZone: MONTHLY_INVOICE_TIMEZONE })
        .split("-");
    const monthNumber = Number(monthInput !== null && monthInput !== void 0 ? monthInput : currentMonth);
    const yearNumber = Number(yearInput !== null && yearInput !== void 0 ? yearInput : currentYear);
    if (!Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12 ||
        !Number.isInteger(yearNumber) ||
        yearNumber < 2000 ||
        yearNumber > 2100) {
        return null;
    }
    const year = String(yearNumber);
    const month = String(monthNumber).padStart(2, "0");
    return {
        year,
        month,
        invoiceDate: `${year}-${month}-01`,
        details: `اشتراك شهري عن ${month}-${year}`,
    };
}
function verifyAndFixSubscriberBalances() {
    return __awaiter(this, void 0, void 0, function* () {
        const subscribersSnap = yield get(ref(database, "Subscribers"));
        const subscribers = subscribersSnap.val();
        if (!subscribers) {
            return {
                hasSubscribers: false,
                fixedCount: 0,
                report: [],
            };
        }
        const [invoicesSnap, paymentsSnap] = yield Promise.all([
            get(ref(database, "Invoices")),
            get(ref(database, "Payments")),
        ]);
        const invoices = invoicesSnap.val() || {};
        const payments = paymentsSnap.val() || {};
        const updates = {};
        const report = [];
        Object.keys(subscribers).forEach((userId) => {
            const subscriber = subscribers[userId];
            const recordedBalance = Number(subscriber.Balance) || 0;
            let totalInvoices = 0;
            Object.values(invoices).forEach((invoice) => {
                if (String(invoice.SubscriberID) === String(userId)) {
                    totalInvoices += Number(invoice.Amount) || 0;
                }
            });
            let totalPayments = 0;
            Object.values(payments).forEach((payment) => {
                if (String(payment.SubscriberID) === String(userId)) {
                    totalPayments += Number(payment.Amount) || 0;
                }
            });
            const expectedBalance = totalPayments - totalInvoices;
            const fixed = expectedBalance !== recordedBalance;
            if (fixed) {
                updates[`Subscribers/${userId}/Balance`] = expectedBalance;
            }
            report.push({
                subscriberId: userId,
                recordedBalance,
                expectedBalance,
                fixed,
            });
        });
        if (Object.keys(updates).length > 0) {
            yield update(ref(database), updates);
        }
        return {
            hasSubscribers: true,
            fixedCount: report.filter((item) => item.fixed).length,
            report,
        };
    });
}
const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbRef = ref(database);
        const snapshot = yield get(child(dbRef, "Subscribers"));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const usersList = Object.keys(data).map((key) => (Object.assign({ id: key }, data[key])));
            res.status(200).json({ success: true, customers: usersList });
        }
        else {
            console.log("No data available");
            res.status(401).json({ error: "Failed to fetch data" });
        }
    }
    catch (error) {
        console.error("Error Firebase Login: ", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});
exports.getCustomers = getCustomers;
const addCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, contactNumber, MonthlyFee, speed, userIp, userName, password, location, sender, dealer, } = req.body;
        if (!name ||
            !contactNumber ||
            !MonthlyFee ||
            !speed ||
            !userIp ||
            !userName ||
            !password ||
            !location ||
            !sender) {
            return res
                .status(400)
                .json({ error: "يرجى تعبئة جميع الحقول المطلوبة." });
        }
        const subscribersRef = ref(database, "Subscribers");
        const newRef = push(subscribersRef);
        const newCustomer = {
            id: newRef.key,
            Name: name,
            Contact: contactNumber,
            MonthlyFee: Number(MonthlyFee),
            SubscriptionSpeed: speed,
            userIp,
            UserName: userName,
            Password: password,
            location,
            sender,
            dealer,
            Balance: 0,
            createdAt: new Date().toISOString(),
        };
        yield set(newRef, newCustomer); // هكذا تستدعي set
        res.status(200).json({
            success: true,
            message: "تم إضافة المشترك بنجاح ✅",
            id: newRef.key,
            data: newCustomer,
        });
    }
    catch (error) {
        console.error("❌ خطأ في الإضافة إلى Firebase:", error);
        res
            .status(500)
            .json({ error: "فشل في إضافة البيانات إلى قاعدة البيانات." });
    }
});
exports.addCustomers = addCustomers;
const getCustomerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        let customerData = [];
        const dbRef = ref(database);
        const snapshot = yield get(child(dbRef, `Subscribers/${id}`));
        if (snapshot.exists()) {
            customerData = snapshot.val();
            res.status(200).json({ success: true, data: customerData });
        }
        else {
            res
                .status(500)
                .json({
                succses: false,
                error: "No data available for this subscriber.",
            });
        }
    }
    catch (error) {
        res.status(500).json({ succses: false, error: error });
    }
});
exports.getCustomerById = getCustomerById;
const getTransactionsForCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriberID } = req.params;
        const subscriberIdAsNumber = Number(subscriberID);
        const subscriberIdAsString = String(subscriberID);
        const invoicesRef = ref(database, "Invoices");
        const paymentsRef = ref(database, "Payments");
        // 🔹 استعلامات الفواتير
        const invoiceQueries = [
            query(invoicesRef, orderByChild("SubscriberID"), equalTo(subscriberIdAsString)),
        ];
        if (!isNaN(subscriberIdAsNumber)) {
            invoiceQueries.push(query(invoicesRef, orderByChild("SubscriberID"), equalTo(subscriberIdAsNumber)));
        }
        // 🔹 استعلامات الدفعات
        const paymentQueries = [
            query(paymentsRef, orderByChild("SubscriberID"), equalTo(subscriberIdAsString)),
        ];
        if (!isNaN(subscriberIdAsNumber)) {
            paymentQueries.push(query(paymentsRef, orderByChild("SubscriberID"), equalTo(subscriberIdAsNumber)));
        }
        // تنفيذ جميع الاستعلامات
        const invoiceSnaps = yield Promise.all(invoiceQueries.map(get));
        const paymentSnaps = yield Promise.all(paymentQueries.map(get));
        const transactions = [];
        const usedIds = new Set();
        // معالجة الفواتير
        invoiceSnaps.forEach((snap) => {
            if (!snap.exists())
                return;
            Object.entries(snap.val()).forEach(([key, invoice]) => {
                if (usedIds.has(key))
                    return;
                usedIds.add(key);
                transactions.push({
                    id: key,
                    type: "invoice",
                    amount: Number(invoice.Amount) || 0,
                    date: invoice.Date,
                    Details: invoice.Details || "",
                });
            });
        });
        // معالجة الدفعات
        paymentSnaps.forEach((snap) => {
            if (!snap.exists())
                return;
            Object.entries(snap.val()).forEach(([key, payment]) => {
                if (usedIds.has(key))
                    return;
                usedIds.add(key);
                transactions.push({
                    id: key,
                    type: "payment",
                    amount: Number(payment.Amount) || 0,
                    date: payment.Date,
                    Details: payment.Details || "",
                });
            });
        });
        // ترتيب حسب التاريخ (الأحدث أولًا)
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions,
        });
    }
    catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب المعاملات",
        });
    }
});
exports.getTransactionsForCustomer = getTransactionsForCustomer;
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const newData = req.body;
        if (!id || !newData) {
            return res
                .status(400)
                .json({ success: false, error: "البيانات غير مكتملة" });
        }
        const customerRef = ref(database, `Subscribers/${id}`);
        yield update(customerRef, newData);
        res
            .status(200)
            .json({ success: true, message: "تم تحديث بيانات المشترك بنجاح" });
    }
    catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({ success: false, error: "حدث خطأ أثناء التحديث" });
    }
});
exports.updateCustomer = updateCustomer;
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(400)
                .json({ success: false, error: "البيانات غير مكتملة" });
        }
        const customerRef = ref(database, `Subscribers/${id}`);
        const customerData = yield get(customerRef).then((snapshot) => __awaiter(void 0, void 0, void 0, function* () {
            if (!snapshot.exists()) {
                return res.status(404).json({ success: false, error: "المشترك غير موجود" });
            }
            return snapshot.val();
        }));
        const deleteLogRef = ref(database, `delete/${id}`);
        yield set(deleteLogRef, Object.assign(Object.assign({}, customerData), { deletedAt: new Date().toISOString() }));
        yield remove(customerRef);
        res
            .status(200)
            .json({ success: true, message: "تم حذف بيانات المشترك بنجاح" });
    }
    catch (error) {
        console.error("Error deleting customer:", error);
        res.status(500).json({ success: false, error: "حدث خطأ أثناء الحذف" });
    }
});
exports.deleteCustomer = deleteCustomer;
const addPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, date, details, subscriberID, total, dealer, type } = req.body;
        if (!amount ||
            !date ||
            !details ||
            !subscriberID ||
            typeof total !== "number") {
            return res.status(400).json({ error: "Missing or invalid fields" });
        }
        // إنشاء payment ID عشوائي
        const newPaymentRef = push(ref(database, "Payments"));
        const paymentID = newPaymentRef.key;
        const subscriberSnap = yield get(ref(database, `Subscribers/${subscriberID}`));
        const subscriber = subscriberSnap.exists() ? subscriberSnap.val() : null;
        const paymentDealer = String(dealer || (subscriber === null || subscriber === void 0 ? void 0 : subscriber.dealer) || "").trim();
        const formData = {
            Amount: amount,
            Date: date,
            Details: details,
            PaymentID: paymentID,
            SubscriberID: subscriberID,
            id: paymentID,
            dealer: paymentDealer || null,
            type: type || 'cash',
        };
        // حفظ في Payments
        yield set(newPaymentRef, formData);
        // حفظ في dealerPayments إذا وُجد dealer
        if (paymentDealer) {
            const dealerPaymentRef = ref(database, `dealerPayments/${paymentDealer}/${paymentID}`);
            yield set(dealerPaymentRef, formData);
        }
        // تحديث رصيد العميل
        const newTotal = Number(total) + Number(amount);
        const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
        yield set(balanceRef, newTotal);
        res.status(200).json({
            message: "Payment added successfully",
            paymentID,
            newTotal,
        });
    }
    catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.addPayment = addPayment;
const addInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, date, details, subscriberID } = req.body;
        // التحقق من الحقول المطلوبة
        if (!amount || !date || !details || !subscriberID) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // جلب الرصيد الحالي للمشترك
        const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
        const balanceSnapshot = yield get(balanceRef);
        const currentBalance = balanceSnapshot.exists()
            ? Number(balanceSnapshot.val())
            : 0;
        // إنشاء المرجع وإضافة الفاتورة باستخدام push()
        const newInvoiceRef = push(ref(database, "Invoices"));
        const invoiceID = newInvoiceRef.key;
        const formData = {
            id: invoiceID,
            InvoiceID: invoiceID,
            Amount: Number(amount),
            Date: date,
            Details: details,
            SubscriberID: subscriberID,
        };
        // حفظ الفاتورة
        yield set(newInvoiceRef, formData);
        // تحديث الرصيد
        const newBalance = currentBalance - Number(amount);
        yield set(balanceRef, newBalance);
        return res.status(200).json({
            message: "Invoice added successfully",
            invoiceID,
            newBalance,
        });
    }
    catch (error) {
        console.error("Error adding invoice:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.addInvoice = addInvoice;
const createMonthlyInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const force = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.force) === true ||
            req.query.force === "true" ||
            req.query.force === "1";
        const period = getMonthlyInvoicePeriod((_b = req.body) === null || _b === void 0 ? void 0 : _b.month, (_c = req.body) === null || _c === void 0 ? void 0 : _c.year);
        if (!period) {
            return res.status(400).json({
                success: false,
                error: "Invalid month or year. Month must be 1-12.",
            });
        }
        const subscribersRef = ref(database, "Subscribers");
        const invoicesRef = ref(database, "Invoices");
        const { year, month, invoiceDate, details } = period;
        const [subscribersSnapshot, invoicesSnapshot] = yield Promise.all([
            get(subscribersRef),
            get(invoicesRef),
        ]);
        const subscribers = subscribersSnapshot.val();
        if (!subscribers) {
            return res.status(200).json({
                success: true,
                message: "No subscribers found.",
                createdCount: 0,
                skippedCount: 0,
            });
        }
        const existingInvoices = invoicesSnapshot.val() || {};
        const existingMonthlyInvoices = new Set();
        Object.values(existingInvoices).forEach((invoice) => {
            if ((invoice === null || invoice === void 0 ? void 0 : invoice.Date) === invoiceDate &&
                (invoice === null || invoice === void 0 ? void 0 : invoice.Details) === details &&
                (invoice === null || invoice === void 0 ? void 0 : invoice.SubscriberID) !== undefined) {
                existingMonthlyInvoices.add(String(invoice.SubscriberID));
            }
        });
        const updates = {};
        const createdInvoices = [];
        const skippedSubscribers = [];
        let totalAmount = 0;
        Object.keys(subscribers).forEach((userId) => {
            const subscriber = subscribers[userId];
            const monthlyFee = Number(subscriber === null || subscriber === void 0 ? void 0 : subscriber.MonthlyFee);
            if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
                return;
            }
            if (!force && existingMonthlyInvoices.has(String(userId))) {
                skippedSubscribers.push(String(userId));
                return;
            }
            const newInvoiceRef = push(invoicesRef);
            const invoiceId = newInvoiceRef.key;
            if (!invoiceId) {
                return;
            }
            const currentBalance = Number(subscriber.Balance) || 0;
            const newBalance = currentBalance - monthlyFee;
            updates[`Invoices/${invoiceId}`] = {
                Amount: monthlyFee,
                Date: invoiceDate,
                Details: details,
                InvoiceID: invoiceId,
                SubscriberID: String(userId),
                Status: "Unpaid",
                id: invoiceId,
            };
            updates[`Subscribers/${userId}/Balance`] = newBalance;
            totalAmount += monthlyFee;
            createdInvoices.push({
                invoiceId,
                subscriberId: String(userId),
                amount: monthlyFee,
                newBalance,
            });
        });
        if (Object.keys(updates).length > 0) {
            yield update(ref(database), updates);
        }
        const balanceFix = yield verifyAndFixSubscriberBalances();
        return res.status(200).json({
            success: true,
            message: "Monthly invoices created successfully.",
            period: `${month}-${year}`,
            invoiceDate,
            createdCount: createdInvoices.length,
            skippedCount: skippedSubscribers.length,
            totalAmount,
            force,
            createdInvoices,
            skippedSubscribers,
            balanceFixedCount: balanceFix.fixedCount,
            balanceReport: balanceFix.report,
        });
    }
    catch (error) {
        console.error("Error creating monthly invoices:", error);
        return res.status(500).json({
            success: false,
            error: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error",
        });
    }
});
exports.createMonthlyInvoices = createMonthlyInvoices;
const fetchData = (path) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbRef = ref(database);
        const snapshot = yield get(child(dbRef, path));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map((key) => (Object.assign({}, data[key])));
        }
        else {
            console.log(`No data available at path: ${path}`);
            return [];
        }
    }
    catch (error) {
        console.error(`Error fetching data from ${path}:`, error);
        return [];
    }
});
const getBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [WifiBalance, WifiPayments] = yield Promise.all([
            fetchData("WifiBalance"),
            fetchData("Payments"),
        ]);
        res.status(200).json({ success: true, WifiBalance, WifiPayments });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, error: "Error reading data: " + error });
    }
});
exports.getBalance = getBalance;
const verifyAndFixBalances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield verifyAndFixSubscriberBalances();
        if (!result.hasSubscribers) {
            return res.status(200).json({ message: "No subscribers found." });
        }
        return res.status(200).json({
            message: "Balances verified and fixed.",
            fixedCount: result.fixedCount,
            report: result.report,
        });
    }
    catch (error) {
        console.error("❌ خطأ أثناء التحقق:", error.message);
        return res.status(500).json({ error: error.message });
    }
});
exports.verifyAndFixBalances = verifyAndFixBalances;
const verifyBalances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // تحميل المشتركين
        const subscribersSnap = yield get(ref(database, "Subscribers"));
        const subscribers = subscribersSnap.val();
        if (!subscribers) {
            return res.status(200).json({ message: "❗ لا يوجد مشتركين!" });
        }
        // تحميل الفواتير
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const invoices = invoicesSnap.val() || {};
        // تحميل الدفعات
        const paymentsSnap = yield get(ref(database, "Payments"));
        const payments = paymentsSnap.val() || {};
        const report = [];
        Object.keys(subscribers).forEach((userId) => {
            const subscriber = subscribers[userId];
            const recordedBalance = Number(subscriber.Balance) || 0;
            // جمع الفواتير
            let totalInvoices = 0;
            Object.values(invoices).forEach((invoice) => {
                if (String(invoice.SubscriberID) === String(userId)) {
                    totalInvoices += Number(invoice.Amount) || 0;
                }
            });
            // جمع الدفعات
            let totalPayments = 0;
            Object.values(payments).forEach((payment) => {
                if (String(payment.SubscriberID) === String(userId)) {
                    totalPayments += Number(payment.Amount) || 0;
                }
            });
            const expectedBalance = totalPayments - totalInvoices;
            report.push({
                subscriberId: userId,
                recordedBalance,
                expectedBalance,
                needsFix: expectedBalance !== recordedBalance,
            });
        });
        return res.status(200).json({
            message: "✅ تم التحقق من الأرصدة (بدون تعديل).",
            report,
        });
    }
    catch (error) {
        console.error("❌ خطأ أثناء التحقق:", error.message);
        return res.status(500).json({ error: error.message });
    }
});
exports.verifyBalances = verifyBalances;
const addWifiExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, details, date, type } = req.body;
        if (!amount || isNaN(amount) || !details || !details.trim() || !type) {
            return res.status(400).json({ error: "Invalid input data" });
        }
        // إنشاء مرجع جديد
        const expensesRef = ref(database, "WifiBalance");
        const newExpenseRef = push(expensesRef);
        // تجهيز البيانات
        const data = {
            id: newExpenseRef.key,
            amount: Number(amount),
            employee: "elidaher",
            type: type.trim(),
            details: details.trim(),
            timestamp: date,
        };
        // الحفظ
        yield set(newExpenseRef, data);
        // الرد على العميل
        return res.status(200).json({
            success: true,
            message: "تمت إضافة النفقة بنجاح",
            data,
        });
    }
    catch (error) {
        console.error("Error in addWifiExpenses:", error);
        return res.status(500).json({
            error: "Internal server error. Please try again later.",
        });
    }
});
exports.addWifiExpenses = addWifiExpenses;
