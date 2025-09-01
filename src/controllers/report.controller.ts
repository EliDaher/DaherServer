import { Request, Response } from "express";
const {
  ref,
  get,
  remove,
  update
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

export const listDuplicateInvoices = async (req: Request, res: Response) => {
  try {
    // تحميل الفواتير
    const invoicesSnap = await get(ref(database, "Invoices"));
    const invoices = invoicesSnap.val();

    if (!invoices) {
      return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
    }

    // تجميع التكرارات
    const seen: Record<string, Array<{ id: string; data: any }>> = {};

    Object.entries(invoices).forEach(([invoiceId, invoice]: any) => {
      const key = `${invoice.SubscriberID}-${invoice.Date}-${invoice.Details}`;
      if (!seen[key]) {
        seen[key] = [];
      }
      seen[key].push({ id: invoiceId, data: invoice });
    });

    // تجهيز قائمة الفواتير التي سيتم حذفها
    const duplicates: Array<{
      keep: { id: string; data: any };
      toDelete: Array<{ id: string; data: any }>;
    }> = [];

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
      duplicates
    });

  } catch (error: any) {
    console.error("❌ خطأ أثناء البحث عن التكرارات:", error.message);
    return res.status(500).json({ error: error.message });
  }
};


export const removeDuplicateInvoices = async (req: Request, res: Response) => {
  try {
    // تحميل الفواتير
    const invoicesSnap = await get(ref(database, "Invoices"));
    const invoices = invoicesSnap.val();

    if (!invoices) {
      return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
    }

    // كائن لتجميع التكرارات
    const seen: Record<string, string[]> = {}; // المفتاح = SubscriberID-Date-Details, القيمة = array of IDs

    Object.entries(invoices).forEach(([invoiceId, invoice]: any) => {
      const key = `${invoice.SubscriberID}-${invoice.Date}-${invoice.Details}`;
      if (!seen[key]) {
        seen[key] = [];
      }
      seen[key].push(invoiceId);
    });

    // حذف التكرارات والإبقاء على واحدة فقط
    const deletions: Promise<void>[] = [];
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
    await Promise.all(deletions);

    return res.status(200).json({
      message: `✅ تم حذف ${duplicatesCount} من الفواتير المكررة.`,
    });
  } catch (error: any) {
    console.error("❌ خطأ أثناء حذف التكرارات:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const listWrongNumberInvoices = async (req: Request, res: Response) => {
  try {
    // تحميل الفواتير
    const invoicesSnap = await get(ref(database, "Invoices"));
    const invoices = invoicesSnap.val();

    if (!invoices) {
      return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
    }

    const seen: any[] = [];
    Object.entries(invoices).forEach(([id, invoice]: any) => {
      if (invoice.Date === "2025-08-01" && invoice.Details === "اشتراك شهري عن 08-2025") {
        seen.push({ id, ...invoice });
      }
    });

    return res.status(200).json({
      message: `✅ تم العثور على ${seen.length} فاتورة مطابقة للشرط.`,
      seen,
    });

  } catch (error: any) {
    console.error("❌ خطأ أثناء البحث عن التكرارات:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const fixWrongNumberInvoices = async (req: Request, res: Response) => {
  try {
    // تحميل الفواتير
    const invoicesSnap = await get(ref(database, "Invoices"));
    const invoices = invoicesSnap.val();

    if (!invoices) {
      return res.status(200).json({ message: "❗ لا يوجد فواتير!" });
    }

    const seen: any[] = [];
    const updates: any = {};

    Object.entries(invoices).forEach(([id, invoice]: any) => {
      if (
        invoice.Date === "2025-08-01" &&
        invoice.Details === "اشتراك شهري عن 08-2025"
      ) {
        seen.push({ id, ...invoice });

        // تجهيز التعديلات
        updates[`Invoices/${id}/Date`] = "2025-09-01";
        updates[`Invoices/${id}/Details`] = "اشتراك شهري عن 09-2025";
      }
    });

    // تنفيذ التعديلات إذا وجد فواتير
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    return res.status(200).json({
      message: `✅ تم العثور على ${seen.length} فاتورة وتم تعديلها.`,
      seenAfterUpdate: seen.map((inv) => ({
        ...inv,
        Date: "2025-09-01",
        Details: "اشتراك شهري عن 09-2025",
      })),
    });
  } catch (error: any) {
    console.error("❌ خطأ أثناء البحث عن التكرارات:", error.message);
    return res.status(500).json({ error: error.message });
  }
};



