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
exports.getSignatures = exports.AddSigSamer = exports.getInquiryLogs = exports.fixWrongNumberInvoices = exports.listWrongNumberInvoices = exports.removeDuplicateInvoices = exports.listDuplicateInvoices = exports.getInvoicesWithStatus = exports.getDebtAgingByBalance = exports.getMonthlyRevenue = void 0;
const { ref, get, remove, update, child, push, set, } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const getMonthlyRevenue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const paymentsSnap = yield get(ref(database, "Payments"));
        const revenueByMonth = {};
        if (invoicesSnap.exists()) {
            const invoicesData = invoicesSnap.val();
            for (const key in invoicesData) {
                const { Amount, Date } = invoicesData[key];
                const month = Date.slice(0, 7); // "YYYY-MM"
                if (!revenueByMonth[month])
                    revenueByMonth[month] = { invoices: 0, payments: 0 };
                revenueByMonth[month].invoices += Number(Amount);
            }
        }
        if (paymentsSnap.exists()) {
            const paymentsData = paymentsSnap.val();
            for (const key in paymentsData) {
                const { Amount, Date } = paymentsData[key];
                const month = Date.slice(0, 7);
                if (!revenueByMonth[month])
                    revenueByMonth[month] = { invoices: 0, payments: 0 };
                revenueByMonth[month].payments += Number(Amount);
            }
        }
        res.status(200).json({ success: true, data: revenueByMonth });
    }
    catch (error) {
        console.error("Error generating monthly revenue report:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
exports.getMonthlyRevenue = getMonthlyRevenue;
const getDebtAgingByBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // جلب المشتركين
        const subscribersSnap = yield get(ref(database, "Subscribers"));
        if (!subscribersSnap.exists()) {
            return res
                .status(404)
                .json({ success: false, error: "No subscribers found." });
        }
        const subscribersData = subscribersSnap.val();
        // جلب المدفوعات
        const paymentsSnap = yield get(ref(database, "Payments"));
        const paymentsData = paymentsSnap.exists() ? paymentsSnap.val() : {};
        // تجهيز التقرير
        const today = new Date();
        const report = [];
        for (const key in subscribersData) {
            const subscriber = subscribersData[key];
            const subscriberID = subscriber.id;
            const balance = Number(subscriber.Balance) || 0;
            // إيجاد آخر دفعة
            let latestPaymentDate = null;
            for (const payKey in paymentsData) {
                const payment = paymentsData[payKey];
                if (payment.SubscriberID === subscriberID) {
                    const paymentDate = new Date(payment.Date);
                    if (!latestPaymentDate || paymentDate > latestPaymentDate) {
                        latestPaymentDate = paymentDate;
                    }
                }
            }
            // حساب الأيام منذ آخر دفعة
            let daysSinceLastPayment = null;
            if (latestPaymentDate) {
                const diffMs = today.getTime() - latestPaymentDate.getTime();
                daysSinceLastPayment = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            }
            // إضافة للسجل
            report.push({
                SubscriberID: subscriberID,
                Name: subscriber.Name,
                Balance: balance,
                DaysSinceLastPayment: daysSinceLastPayment,
            });
        }
        res.status(200).json({ success: true, data: report });
    }
    catch (error) {
        console.error("Error generating debt aging report:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
exports.getDebtAgingByBalance = getDebtAgingByBalance;
const getInvoicesWithStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const paymentsSnap = yield get(ref(database, "Payments"));
        const paymentsBySubscriber = {};
        if (paymentsSnap.exists()) {
            const paymentsData = paymentsSnap.val();
            for (const key in paymentsData) {
                const { SubscriberID, Amount } = paymentsData[key];
                if (!paymentsBySubscriber[SubscriberID])
                    paymentsBySubscriber[SubscriberID] = 0;
                paymentsBySubscriber[SubscriberID] += Number(Amount);
            }
        }
        const report = [];
        if (invoicesSnap.exists()) {
            const invoicesData = invoicesSnap.val();
            for (const key in invoicesData) {
                const invoice = invoicesData[key];
                const { SubscriberID, Amount, Date, Details, InvoiceID } = invoice;
                // المبلغ المدفوع للمشترك حتى الآن
                const totalPaid = paymentsBySubscriber[SubscriberID] || 0;
                let status = "غير مدفوعة";
                if (totalPaid >= Amount)
                    status = "مدفوعة بالكامل";
                else if (totalPaid > 0 && totalPaid < Amount)
                    status = "مدفوعة جزئيا";
                report.push({
                    InvoiceID,
                    Date,
                    Details,
                    Amount,
                    PaymentStatus: status,
                });
            }
        }
        res.status(200).json({ success: true, data: report });
    }
    catch (error) {
        console.error("Error generating invoice report:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
exports.getInvoicesWithStatus = getInvoicesWithStatus;
const listDuplicateInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // تحميل الفواتير
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const invoices = invoicesSnap.val();
        if (!invoices) {
            return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
        }
        // تجميع التكرارات
        const seen = {};
        Object.entries(invoices).forEach(([invoiceId, invoice]) => {
            const key = `${invoice.SubscriberID}-${invoice.Date}-${invoice.Details}`;
            if (!seen[key]) {
                seen[key] = [];
            }
            seen[key].push({ id: invoiceId, data: invoice });
        });
        // تجهيز قائمة الفواتير التي سيتم حذفها
        const duplicates = [];
        Object.entries(seen).forEach(([key, invoicesArray]) => {
            if (invoicesArray.length > 1) {
                duplicates.push({
                    keep: invoicesArray[0], // أول فاتورة تُترك
                    toDelete: invoicesArray.slice(1), // الباقي يُعتبر تكرار
                });
            }
        });
        return res.status(200).json({
            message: `✅ تم العثور على ${duplicates.length} مجموعة فواتير مكررة.`,
            duplicates,
        });
    }
    catch (error) {
        console.error("❌ خطأ أثناء البحث عن التكرارات:", error.message);
        return res.status(500).json({ error: error.message });
    }
});
exports.listDuplicateInvoices = listDuplicateInvoices;
const removeDuplicateInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // تحميل الفواتير
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const invoices = invoicesSnap.val();
        if (!invoices) {
            return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
        }
        // كائن لتجميع التكرارات
        const seen = {}; // المفتاح = SubscriberID-Date-Details, القيمة = array of IDs
        Object.entries(invoices).forEach(([invoiceId, invoice]) => {
            const key = `${invoice.SubscriberID}-${invoice.Date}-${invoice.Details}`;
            if (!seen[key]) {
                seen[key] = [];
            }
            seen[key].push(invoiceId);
        });
        // حذف التكرارات والإبقاء على واحدة فقط
        const deletions = [];
        let duplicatesCount = 0;
        Object.entries(seen).forEach(([key, ids]) => {
            if (ids.length > 1) {
                // يوجد تكرار
                duplicatesCount += ids.length - 1;
                // أبقِ أول عنصر واحذف البقية
                const idsToDelete = ids.slice(1);
                idsToDelete.forEach((id) => {
                    const deleteRef = ref(database, `Invoices/${id}`);
                    deletions.push(remove(deleteRef));
                });
            }
        });
        // تنفيذ الحذف
        yield Promise.all(deletions);
        return res.status(200).json({
            message: `✅ تم حذف ${duplicatesCount} من الفواتير المكررة.`,
        });
    }
    catch (error) {
        console.error("❌ خطأ أثناء حذف التكرارات:", error.message);
        return res.status(500).json({ error: error.message });
    }
});
exports.removeDuplicateInvoices = removeDuplicateInvoices;
const listWrongNumberInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // تحميل الفواتير
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const invoices = invoicesSnap.val();
        if (!invoices) {
            return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
        }
        const seen = [];
        Object.entries(invoices).forEach(([id, invoice]) => {
            if (invoice.Date === "2025-08-01" &&
                invoice.Details === "اشتراك شهري عن 08-2025") {
                seen.push(Object.assign({ id }, invoice));
            }
        });
        return res.status(200).json({
            message: `✅ تم العثور على ${seen.length} فاتورة مطابقة للشرط.`,
            seen,
        });
    }
    catch (error) {
        console.error("❌ خطأ أثناء البحث عن التكرارات:", error.message);
        return res.status(500).json({ error: error.message });
    }
});
exports.listWrongNumberInvoices = listWrongNumberInvoices;
const fixWrongNumberInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // تحميل الفواتير
        const invoicesSnap = yield get(ref(database, "Invoices"));
        const invoices = invoicesSnap.val();
        if (!invoices) {
            return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
        }
        const seen = [];
        const updates = {};
        Object.entries(invoices).forEach(([id, invoice]) => {
            if (invoice.Date === "2025-07-01" &&
                invoice.Details === "اشتراك شهري عن 07-2025") {
                seen.push(Object.assign({ id }, invoice));
                // تجهيز التعديلات
                updates[`Invoices/${id}/Date`] = "2025-08-01";
                updates[`Invoices/${id}/Details`] = "اشتراك شهري عن 08-2025";
            }
        });
        // تنفيذ التعديلات إذا وجد فواتير
        if (Object.keys(updates).length > 0) {
            yield update(ref(database), updates);
        }
        return res.status(200).json({
            message: `✅ تم العثور على ${seen.length} فاتورة وتم تعديلها.`,
            seenAfterUpdate: seen.map((inv) => (Object.assign(Object.assign({}, inv), { Date: "2025-09-01", Details: "اشتراك شهري عن 09-2025" }))),
        });
    }
    catch (error) {
        console.error("❌ خطأ أثناء البحث عن التكرارات:", error.message);
        return res.status(500).json({ error: error.message });
    }
});
exports.fixWrongNumberInvoices = fixWrongNumberInvoices;
const getInquiryLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = req.query.date || new Date().toISOString().split("T")[0];
        const dbRef = ref(database);
        const snapshot = yield get(child(dbRef, `astalamatLogs/${date}`));
        if (!snapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "لا توجد بيانات لهذا اليوم",
            });
        }
        const data = snapshot.val();
        const logsArray = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
        return res.status(200).json({
            success: true,
            logs: logsArray,
        });
    }
    catch (error) {
        console.error("Error fetching daily total balance:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب البيانات",
            error: error.message,
        });
    }
});
exports.getInquiryLogs = getInquiryLogs;
const AddSigSamer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, number, email, country, camp } = req.body;
        if (!firstName || !lastName || !number || !email || !country || !camp) {
            return res
                .status(400)
                .json({ error: "يرجى تعبئة جميع الحقول المطلوبة." });
        }
        const subscribersRef = ref(database, "Signatures");
        const newRef = push(subscribersRef);
        const newSignatures = {
            id: newRef.key,
            firstName,
            lastName,
            number,
            email,
            country,
            camp,
            createdAt: new Date().toISOString(),
            timestamp: Date.now(),
        };
        yield set(newRef, newSignatures); // هكذا تستدعي set
        res.status(200).json({
            success: true,
            message: "تم إضافة المشترك بنجاح ✅",
            id: newRef.key,
            data: newSignatures,
        });
    }
    catch (error) {
        console.error("❌ خطأ في الإضافة إلى Firebase:", error);
        res
            .status(500)
            .json({ error: "فشل في إضافة البيانات إلى قاعدة البيانات." });
    }
});
exports.AddSigSamer = AddSigSamer;
const getSignatures = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbRef = ref(database);
        const snapshot = yield get(child(dbRef, "Signatures"));
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
exports.getSignatures = getSignatures;
