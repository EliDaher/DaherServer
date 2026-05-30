import { Request, Response } from "express";
const {
  ref,
  get,
  child,
  orderByChild,
  query,
  equalTo,
  update,
  set,
  push,
  remove,
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

const MONTHLY_INVOICE_TIMEZONE = "Asia/Damascus";

type BalanceFixReportItem = {
  subscriberId: string;
  recordedBalance: number;
  expectedBalance: number;
  fixed: boolean;
};

function getMonthlyInvoicePeriod(monthInput?: unknown, yearInput?: unknown) {
  const [currentYear, currentMonth] = new Date()
    .toLocaleDateString("en-CA", { timeZone: MONTHLY_INVOICE_TIMEZONE })
    .split("-");

  const monthNumber = Number(monthInput ?? currentMonth);
  const yearNumber = Number(yearInput ?? currentYear);

  if (
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    !Number.isInteger(yearNumber) ||
    yearNumber < 2000 ||
    yearNumber > 2100
  ) {
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

async function verifyAndFixSubscriberBalances() {
  const subscribersSnap = await get(ref(database, "Subscribers"));
  const subscribers = subscribersSnap.val();

  if (!subscribers) {
    return {
      hasSubscribers: false,
      fixedCount: 0,
      report: [] as BalanceFixReportItem[],
    };
  }

  const [invoicesSnap, paymentsSnap] = await Promise.all([
    get(ref(database, "Invoices")),
    get(ref(database, "Payments")),
  ]);

  const invoices = invoicesSnap.val() || {};
  const payments = paymentsSnap.val() || {};

  const updates: Record<string, number> = {};
  const report: BalanceFixReportItem[] = [];

  Object.keys(subscribers).forEach((userId) => {
    const subscriber = subscribers[userId];
    const recordedBalance = Number(subscriber.Balance) || 0;

    let totalInvoices = 0;
    Object.values(invoices).forEach((invoice: any) => {
      if (String(invoice.SubscriberID) === String(userId)) {
        totalInvoices += Number(invoice.Amount) || 0;
      }
    });

    let totalPayments = 0;
    Object.values(payments).forEach((payment: any) => {
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
    await update(ref(database), updates);
  }

  return {
    hasSubscribers: true,
    fixedCount: report.filter((item) => item.fixed).length,
    report,
  };
}

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, "Subscribers"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const usersList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      res.status(200).json({ success: true, customers: usersList });
    } else {
      console.log("No data available");
      res.status(401).json({ error: "Failed to fetch data" });
    }
  } catch (error) {
    console.error("Error Firebase Login: ", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
};
export const addCustomers = async (req: Request, res: Response) => {
  try {
    const {
      name,
      contactNumber,
      MonthlyFee,
      speed,
      userIp,
      userName,
      password,
      location,
      sender,
      dealer,
    } = req.body;

    if (
      !name ||
      !contactNumber ||
      !MonthlyFee ||
      !speed ||
      !userIp ||
      !userName ||
      !password ||
      !location ||
      !sender
    ) {
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

    await set(newRef, newCustomer); // هكذا تستدعي set

    res.status(200).json({
      success: true,
      message: "تم إضافة المشترك بنجاح ✅",
      id: newRef.key,
      data: newCustomer,
    });
  } catch (error) {
    console.error("❌ خطأ في الإضافة إلى Firebase:", error);
    res
      .status(500)
      .json({ error: "فشل في إضافة البيانات إلى قاعدة البيانات." });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let customerData = [];
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `Subscribers/${id}`));
    if (snapshot.exists()) {
      customerData = snapshot.val();
      res.status(200).json({ success: true, data: customerData });
    } else {
      res
        .status(500)
        .json({
          succses: false,
          error: "No data available for this subscriber.",
        });
    }
  } catch (error) {
    res.status(500).json({ succses: false, error: error });
  }
};





export const getTransactionsForCustomer = async (
  req: Request,
  res: Response,
) => {
  try {
    const { subscriberID } = req.params;

    const subscriberIdAsNumber = Number(subscriberID);
    const subscriberIdAsString = String(subscriberID);

    const invoicesRef = ref(database, "Invoices");
    const paymentsRef = ref(database, "Payments");

    // 🔹 استعلامات الفواتير
    const invoiceQueries = [
      query(
        invoicesRef,
        orderByChild("SubscriberID"),
        equalTo(subscriberIdAsString),
      ),
    ];

    if (!isNaN(subscriberIdAsNumber)) {
      invoiceQueries.push(
        query(
          invoicesRef,
          orderByChild("SubscriberID"),
          equalTo(subscriberIdAsNumber),
        ),
      );
    }

    // 🔹 استعلامات الدفعات
    const paymentQueries = [
      query(
        paymentsRef,
        orderByChild("SubscriberID"),
        equalTo(subscriberIdAsString),
      ),
    ];

    if (!isNaN(subscriberIdAsNumber)) {
      paymentQueries.push(
        query(
          paymentsRef,
          orderByChild("SubscriberID"),
          equalTo(subscriberIdAsNumber),
        ),
      );
    }

    // تنفيذ جميع الاستعلامات
    const invoiceSnaps = await Promise.all(invoiceQueries.map(get));
    const paymentSnaps = await Promise.all(paymentQueries.map(get));

    const transactions: any[] = [];
    const usedIds = new Set<string>();

    // معالجة الفواتير
    invoiceSnaps.forEach((snap: any) => {
      if (!snap.exists()) return;

      Object.entries(snap.val()).forEach(([key, invoice]: any) => {
        if (usedIds.has(key)) return;

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
    paymentSnaps.forEach((snap: any) => {
      if (!snap.exists()) return;

      Object.entries(snap.val()).forEach(([key, payment]: any) => {
        if (usedIds.has(key)) return;

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
    transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب المعاملات",
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newData = req.body;

    if (!id || !newData) {
      return res
        .status(400)
        .json({ success: false, error: "البيانات غير مكتملة" });
    }

    const customerRef = ref(database, `Subscribers/${id}`);
    await update(customerRef, newData);

    res
      .status(200)
      .json({ success: true, message: "تم تحديث بيانات المشترك بنجاح" });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ success: false, error: "حدث خطأ أثناء التحديث" });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "البيانات غير مكتملة" });
    }

    const customerRef = ref(database, `Subscribers/${id}`);
    const customerData = await get(customerRef).then(async (snapshot: any) => {
      if (!snapshot.exists()) {
        return res.status(404).json({ success: false, error: "المشترك غير موجود" });
      }
      return snapshot.val();
    });

    const deleteLogRef = ref(database, `delete/${id}`);
    await set(deleteLogRef, { 
      ...customerData,
      deletedAt: new Date().toISOString() 
    });

    await remove(customerRef);

    res
      .status(200)
      .json({ success: true, message: "تم حذف بيانات المشترك بنجاح" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ success: false, error: "حدث خطأ أثناء الحذف" });
  }
};

export const addPayment = async (req: Request, res: Response) => {
  try {
    const { amount, date, details, subscriberID, total, dealer, type } = req.body;

    if (
      !amount ||
      !date ||
      !details ||
      !subscriberID ||
      typeof total !== "number"
    ) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    // إنشاء payment ID عشوائي
    const newPaymentRef = push(ref(database, "Payments"));
    const paymentID = newPaymentRef.key;

    const formData = {
      Amount: amount,
      Date: date,
      Details: details,
      PaymentID: paymentID,
      SubscriberID: subscriberID,
      id: paymentID,
      type: type || 'cash',
    };

    // حفظ في Payments
    await set(newPaymentRef, formData);

    // حفظ في dealerPayments إذا وُجد dealer
    if (dealer) { 
      const dealerPaymentRef = ref(
        database,
        `dealerPayments/${dealer}/${paymentID}`
      );
      await set(dealerPaymentRef, formData);
    }

    // تحديث رصيد العميل
    const newTotal = Number(total) + Number(amount);
    const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
    await set(balanceRef, newTotal);

    res.status(200).json({
      message: "Payment added successfully",
      paymentID,
      newTotal,
    });
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addInvoice = async (req: Request, res: Response) => {
  try {
    const { amount, date, details, subscriberID } = req.body;

    // التحقق من الحقول المطلوبة
    if (!amount || !date || !details || !subscriberID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // جلب الرصيد الحالي للمشترك
    const balanceRef = ref(database, `Subscribers/${subscriberID}/Balance`);
    const balanceSnapshot = await get(balanceRef);
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
    await set(newInvoiceRef, formData);

    // تحديث الرصيد
    const newBalance = currentBalance - Number(amount);
    await set(balanceRef, newBalance);

    return res.status(200).json({
      message: "Invoice added successfully",
      invoiceID,
      newBalance,
    });
  } catch (error) {
    console.error("Error adding invoice:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createMonthlyInvoices = async (req: Request, res: Response) => {
  try {
    const force =
      req.body?.force === true ||
      req.query.force === "true" ||
      req.query.force === "1";

    const period = getMonthlyInvoicePeriod(req.body?.month, req.body?.year);

    if (!period) {
      return res.status(400).json({
        success: false,
        error: "Invalid month or year. Month must be 1-12.",
      });
    }

    const subscribersRef = ref(database, "Subscribers");
    const invoicesRef = ref(database, "Invoices");
    const { year, month, invoiceDate, details } = period;

    const [subscribersSnapshot, invoicesSnapshot] = await Promise.all([
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
    const existingMonthlyInvoices = new Set<string>();

    Object.values(existingInvoices).forEach((invoice: any) => {
      if (
        invoice?.Date === invoiceDate &&
        invoice?.Details === details &&
        invoice?.SubscriberID !== undefined
      ) {
        existingMonthlyInvoices.add(String(invoice.SubscriberID));
      }
    });

    const updates: Record<string, any> = {};
    const createdInvoices: Array<{
      invoiceId: string;
      subscriberId: string;
      amount: number;
      newBalance: number;
    }> = [];
    const skippedSubscribers: string[] = [];
    let totalAmount = 0;

    Object.keys(subscribers).forEach((userId) => {
      const subscriber = subscribers[userId];
      const monthlyFee = Number(subscriber?.MonthlyFee);

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
      await update(ref(database), updates);
    }

    const balanceFix = await verifyAndFixSubscriberBalances();

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
  } catch (error: any) {
    console.error("Error creating monthly invoices:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
};

const fetchData = async (path: any) => {
  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, path));

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({ ...data[key] }));
    } else {
      console.log(`No data available at path: ${path}`);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching data from ${path}:`, error);
    return [];
  }
};

export const getBalance = async (req: Request, res: Response) => {
  try {
    const [WifiBalance, WifiPayments] = await Promise.all([
      fetchData("WifiBalance"),
      fetchData("Payments"),
    ]);

    res.status(200).json({ success: true, WifiBalance, WifiPayments });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Error reading data: " + error });
  }
};

export const verifyAndFixBalances = async (req: Request, res: Response) => {
  try {
    const result = await verifyAndFixSubscriberBalances();

    if (!result.hasSubscribers) {
      return res.status(200).json({ message: "No subscribers found." });
    }

    return res.status(200).json({
      message: "Balances verified and fixed.",
      fixedCount: result.fixedCount,
      report: result.report,
    });
  } catch (error: any) {
    console.error("❌ خطأ أثناء التحقق:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const verifyBalances = async (req: Request, res: Response) => {
  try {
    // تحميل المشتركين
    const subscribersSnap = await get(ref(database, "Subscribers"));
    const subscribers = subscribersSnap.val();

    if (!subscribers) {
      return res.status(200).json({ message: "❗ لا يوجد مشتركين!" });
    }

    // تحميل الفواتير
    const invoicesSnap = await get(ref(database, "Invoices"));
    const invoices = invoicesSnap.val() || {};

    // تحميل الدفعات
    const paymentsSnap = await get(ref(database, "Payments"));
    const payments = paymentsSnap.val() || {};

    const report: Array<{
      subscriberId: string;
      recordedBalance: number;
      expectedBalance: number;
      needsFix: boolean;
    }> = [];

    Object.keys(subscribers).forEach((userId) => {
      const subscriber = subscribers[userId];
      const recordedBalance = Number(subscriber.Balance) || 0;

      // جمع الفواتير
      let totalInvoices = 0;
      Object.values(invoices).forEach((invoice: any) => {
        if (String(invoice.SubscriberID) === String(userId)) {
          totalInvoices += Number(invoice.Amount) || 0;
        }
      });

      // جمع الدفعات
      let totalPayments = 0;
      Object.values(payments).forEach((payment: any) => {
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
  } catch (error: any) {
    console.error("❌ خطأ أثناء التحقق:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const addWifiExpenses = async (req: Request, res: Response) => {
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
    await set(newExpenseRef, data);

    // الرد على العميل
    return res.status(200).json({
      success: true,
      message: "تمت إضافة النفقة بنجاح",
      data,
    });
  } catch (error) {
    console.error("Error in addWifiExpenses:", error);
    return res.status(500).json({
      error: "Internal server error. Please try again later.",
    });
  }
};
