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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export default async function addPayment(req: Request, res: Response) {
  try {
    const { amount, date, details, subscriberID, dealer } = req.body;
    const paymentDealer = normalizeText(dealer);

    if (!amount || !date || !details || !subscriberID || !paymentDealer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newDataRef = push(ref(database, "Payments"));
    const paymentID = newDataRef.key;

    const formData = {
      Amount: amount,
      Date: date,
      Details: details,
      PaymentID: paymentID,
      SubscriberID: subscriberID,
      id: paymentID,
      dealer: paymentDealer,
    };

    await set(newDataRef, formData);
    await set(ref(database, `dealerPayments/${paymentDealer}/${paymentID}`), formData);

    const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
    let newTotal = 0;
    await runTransaction(balanceRef, (currentBalance: any) => {
      newTotal = (currentBalance || 0) + Number(amount);
      return newTotal;
    });

    res
      .status(200)
      .json({ message: "Payment added successfully", paymentID, newTotal });
  } catch (err) {
    console.error("Error Firebase add dealer payment: ", err);
    res.status(500).json({ success: false, error: err });
  }
}

export async function getPayments(req: Request, res: Response) {
  try {
    const dbRef = ref(database);
    const dealerFilter = normalizeText(req.query.dealer).toLowerCase();

    const paymentsSnap = await get(child(dbRef, "Payments"));
    if (!paymentsSnap.exists()) {
      return res.status(200).json({ success: true, Payments: {} });
    }

    const payments = paymentsSnap.val();
    const subscribersSnap = await get(child(dbRef, "Subscribers"));
    const subscribers = subscribersSnap.exists() ? subscribersSnap.val() : {};
    const result: Record<string, unknown> = {};

    Object.entries(payments).forEach(([key, payment]: [string, any]) => {
      const subscriber = subscribers[payment.SubscriberID];
      const paymentDealer = normalizeText(payment?.dealer || subscriber?.dealer);

      if (!dealerFilter || paymentDealer.toLowerCase() === dealerFilter) {
        result[key] = {
          ...payment,
          dealer: paymentDealer,
          subscriber,
        };
      }
    });

    res.status(200).json({ success: true, Payments: result });
  } catch (err) {
    console.error("Error Firebase getPayments: ", err);
    res.status(500).json({ success: false, error: err });
  }
}
