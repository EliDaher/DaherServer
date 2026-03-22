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
exports.default = addPayment;
exports.getPayments = getPayments;
const { ref, push, set, runTransaction, get, child, } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
function addPayment(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { amount, date, details, subscriberID, dealer } = req.body;
            if (!amount || !date || !details || !subscriberID || !dealer) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            // إنشاء معرف جديد باستخدام push
            const newDataRef = push(ref(database, "Payments"));
            const paymentID = newDataRef.key;
            const formData = {
                Amount: amount,
                Date: date,
                Details: details,
                PaymentID: paymentID,
                SubscriberID: subscriberID,
                id: paymentID,
            };
            // حفظ الدفعة تحت Payments
            yield set(newDataRef, formData);
            // حفظ الدفعة تحت dealerPayments
            const dealerRef = ref(database, `dealerPayments/${dealer}/${paymentID}`);
            yield set(dealerRef, formData);
            // تحديث الرصيد باستخدام runTransaction
            const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
            let newTotal = 0;
            yield runTransaction(balanceRef, (currentBalance) => {
                newTotal = (currentBalance || 0) + Number(amount);
                return newTotal;
            });
            res
                .status(200)
                .json({ message: "Payment added successfully", paymentID, newTotal });
        }
        catch (err) {
            console.error("Error Firebase add dealer payment: ", err);
            res.status(500).json({ success: false, error: err });
        }
    });
}
function getPayments(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dbRef = ref(database);
            const paymentsSnap = yield get(child(dbRef, "Payments"));
            if (!paymentsSnap.exists()) {
                return res
                    .status(404)
                    .json({ success: false, message: "❗ لا يوجد دفعات" });
            }
            const payments = paymentsSnap.val();
            const subscribersSnap = yield get(child(dbRef, "Subscribers"));
            const subscribers = subscribersSnap.exists() ? subscribersSnap.val() : {};
            const result = {};
            Object.entries(payments).forEach(([key, payment]) => {
                const subscriber = subscribers[payment.SubscriberID];
                // ✅ فقط المشتركين dealer = habeb
                if ((subscriber === null || subscriber === void 0 ? void 0 : subscriber.dealer) === "habeb") {
                    result[key] = Object.assign(Object.assign({}, payment), { subscriber });
                }
            });
            res.status(200).json({ success: true, Payments: result });
        }
        catch (err) {
            console.error("Error Firebase getPayments: ", err);
            res.status(500).json({ success: false, error: err });
        }
    });
}
