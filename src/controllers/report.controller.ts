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

export const getAgingReport = async (req: Request, res: Response) => {
  try {
    const invoicesSnap = await get(ref(database, "Invoices"));
    const agingBuckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };

    if (invoicesSnap.exists()) {
      const invoicesData = invoicesSnap.val();
      const today = new Date();

      for (const key in invoicesData) {
        const { Amount, Date } = invoicesData[key];
        const invoiceDate = new Date(Date);
        const diffDays = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) agingBuckets["0-30"] += Number(Amount);
        else if (diffDays <= 60) agingBuckets["31-60"] += Number(Amount);
        else if (diffDays <= 90) agingBuckets["61-90"] += Number(Amount);
        else agingBuckets["90+"] += Number(Amount);
      }
    }

    res.status(200).json({ success: true, data: agingBuckets });

  } catch (error) {
    console.error("Error generating aging report:", error);
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

