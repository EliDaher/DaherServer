import { Request, Response } from "express";
const {
  ref,
  push,
  set,
  runTransaction,
  get,
  child,
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export default async function addPayment(req: Request, res: Response) {
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
    await set(newDataRef, formData);

    // حفظ الدفعة تحت dealerPayments
    const dealerRef = ref(database, `dealerPayments/${dealer}/${paymentID}`);
    await set(dealerRef, formData);

    // تحديث الرصيد باستخدام runTransaction
    const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
    let newTotal = 0;
    await runTransaction(balanceRef, (currentBalance: any) => {
      newTotal = (currentBalance || 0) + Number(amount);
      return newTotal;
    });

    res.status(200).json({ message: "Payment added successfully", paymentID, newTotal });
  } catch (err) {
    console.error("Error Firebase add dealer payment: ", err);
    res.status(500).json({ success: false, error: err });
  }
}

export async function getPayments(req: Request, res: Response) {
  try {
    const dbRef = ref(database);

    // ✅ تحميل جميع الدفعات
    const paymentsSnap = await get(child(dbRef, "dealerPayments"));
    if (!paymentsSnap.exists()) {
      return res.status(404).json({ success: false, message: "❗ لا يوجد دفعات" });
    }
    const payments = paymentsSnap.val();

    // ✅ تحميل جميع المشتركين
    const subscribersSnap = await get(child(dbRef, "Subscribers"));
    const subscribers = subscribersSnap.exists() ? subscribersSnap.val() : {};

    // ✅ ربط الدفعات مع المشتركين
    const result: any = {};
    Object.entries(payments).forEach(([key, payment]: [string, any]) => {
      result[key] = {
        ...payment,
        subscriber: subscribers[payment.SubscriberID] || null, // 🔗 إما بيانات أو null
      };
    });

    res.status(200).json({ success: true, Payments: result });
  } catch (err) {
    console.error("Error Firebase getPayments: ", err);
    res.status(500).json({ success: false, error: err });
  }
}
