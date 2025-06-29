import { Request, Response } from "express";
const {
  ref,
  get,
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");


export const getMonthlyRevenue = async (req: Request, res: Response) => {
  try {
    const invoicesSnap = await get(ref(database, "Invoices"));
    const paymentsSnap = await get(ref(database, "Payments"));

    const revenueByMonth: Record<string, { invoices: number; payments: number }> = {};

    if (invoicesSnap.exists()) {
      const invoicesData = invoicesSnap.val();
      for (const key in invoicesData) {
        const { Amount, Date } = invoicesData[key];
        const month = Date.slice(0, 7); // "YYYY-MM"
        if (!revenueByMonth[month]) revenueByMonth[month] = { invoices: 0, payments: 0 };
        revenueByMonth[month].invoices += Number(Amount);
      }
    }

    if (paymentsSnap.exists()) {
      const paymentsData = paymentsSnap.val();
      for (const key in paymentsData) {
        const { Amount, Date } = paymentsData[key];
        const month = Date.slice(0, 7);
        if (!revenueByMonth[month]) revenueByMonth[month] = { invoices: 0, payments: 0 };
        revenueByMonth[month].payments += Number(Amount);
      }
    }

    res.status(200).json({ success: true, data: revenueByMonth });

  } catch (error) {
    console.error("Error generating monthly revenue report:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getDebtAgingByBalance = async (req: Request, res: Response) => {
  try {
    // جلب المشتركين
    const subscribersSnap = await get(ref(database, "Subscribers"));
    if (!subscribersSnap.exists()) {
      return res.status(404).json({ success: false, error: "No subscribers found." });
    }
    const subscribersData = subscribersSnap.val();

    // جلب المدفوعات
    const paymentsSnap = await get(ref(database, "Payments"));
    const paymentsData = paymentsSnap.exists() ? paymentsSnap.val() : {};

    // تجهيز التقرير
    const today = new Date();
    const report: any[] = [];

    for (const key in subscribersData) {
      const subscriber = subscribersData[key];
      const subscriberID = subscriber.id;
      const balance = Number(subscriber.Balance) || 0;

      // إيجاد آخر دفعة
      let latestPaymentDate: Date | null = null;
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

  } catch (error) {
    console.error("Error generating debt aging report:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getInvoicesWithStatus = async (req: Request, res: Response) => {
  try {
    const invoicesSnap = await get(ref(database, "Invoices"));
    const paymentsSnap = await get(ref(database, "Payments"));

    const paymentsBySubscriber: Record<string, number> = {};

    if (paymentsSnap.exists()) {
      const paymentsData = paymentsSnap.val();
      for (const key in paymentsData) {
        const { SubscriberID, Amount } = paymentsData[key];
        if (!paymentsBySubscriber[SubscriberID]) paymentsBySubscriber[SubscriberID] = 0;
        paymentsBySubscriber[SubscriberID] += Number(Amount);
      }
    }

    const report: any[] = [];

    if (invoicesSnap.exists()) {
      const invoicesData = invoicesSnap.val();
      for (const key in invoicesData) {
        const invoice = invoicesData[key];
        const { SubscriberID, Amount, Date, Details, InvoiceID } = invoice;

        // المبلغ المدفوع للمشترك حتى الآن
        const totalPaid = paymentsBySubscriber[SubscriberID] || 0;

        let status = "غير مدفوعة";
        if (totalPaid >= Amount) status = "مدفوعة بالكامل";
        else if (totalPaid > 0 && totalPaid < Amount) status = "مدفوعة جزئيا";

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

  } catch (error) {
    console.error("Error generating invoice report:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

