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
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const getCustomers = async (req: Request, res: Response) => {

    try {

        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'Subscribers')); 
        if (snapshot.exists()) {
            const data = snapshot.val();
            const usersList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
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
      !name || !contactNumber || !MonthlyFee || !speed ||
      !userIp || !userName || !password || !location || !sender
    ) {
      return res.status(400).json({ error: "يرجى تعبئة جميع الحقول المطلوبة." });
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

    await set(newRef, newCustomer);  // هكذا تستدعي set

    res.status(200).json({
      success: true,
      message: "تم إضافة المشترك بنجاح ✅",
      id: newRef.key,
      data: newCustomer,
    });

  } catch (error) {
    console.error("❌ خطأ في الإضافة إلى Firebase:", error);
    res.status(500).json({ error: "فشل في إضافة البيانات إلى قاعدة البيانات." });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {

    try {
        const { id } = req.params
        let customerData = []
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `Subscribers/${id}`));
        if (snapshot.exists()) {
            customerData = snapshot.val();
            res.status(200).json({ success: true, data: customerData });
        } else {
            res.status(500).json({succses: false, error: "No data available for this subscriber."});
        }
    } catch (error) {
        res.status(500).json({succses: false, error: error});
    }

};

export const getTransactionsForCustomer = async (req: Request, res: Response) => {
  try {
    const { subscriberID } = req.params;

    const invoicesRef = ref(database, "Invoices");
    const paymentsRef = ref(database, "Payments");

    const invoicesQuery = query(invoicesRef, orderByChild("SubscriberID"), equalTo(subscriberID));
    const paymentsQuery = query(paymentsRef, orderByChild("SubscriberID"), equalTo(subscriberID));

    const [invoicesSnap, paymentsSnap] = await Promise.all([
      get(invoicesQuery),
      get(paymentsQuery),
    ]);

    const transactions: any[] = [];

    if (invoicesSnap.exists()) {
      const invoicesData = invoicesSnap.val();
      for (const key in invoicesData) {
        transactions.push({
          id: key,
          type: "invoice",
          amount: invoicesData[key].Amount,
          date: invoicesData[key].Date,
          Details: invoicesData[key].Details || "",
        });
      }
    }

    if (paymentsSnap.exists()) {
      const paymentsData = paymentsSnap.val();
      for (const key in paymentsData) {
        transactions.push({
          id: key,
          type: "payment",
          amount: paymentsData[key].Amount,
          date: paymentsData[key].Date,
          Details: paymentsData[key].Details || "",
        });
      }
    }

    // ترتيب حسب التاريخ تنازليًا
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json({ success: true, data: transactions });

  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, error: "حدث خطأ أثناء جلب المعاملات" });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newData = req.body;

    if (!id || !newData) {
      return res.status(400).json({ success: false, error: "البيانات غير مكتملة" });
    }

    const customerRef = ref(database, `Subscribers/${id}`);
    await update(customerRef, newData);

    res.status(200).json({ success: true, message: "تم تحديث بيانات المشترك بنجاح" });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ success: false, error: "حدث خطأ أثناء التحديث" });
  }
};


export const addPayment = async (req: Request, res: Response) => {
  try {
    const { amount, date, details, subscriberID, total, dealer } = req.body;

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
    };

    // حفظ في Payments
    await set(newPaymentRef, formData);

    // حفظ في dealerPayments إذا وُجد dealer
    if (dealer) {
      const dealerPaymentRef = ref(database, `dealerPayments/${dealer}/${paymentID}`);
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



const fetchData = async (path: any) => {
    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, path));

        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({ ...data[key] }));
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
        fetchData("Payments")
      ]);

      res.status(200).json({ success: true, WifiBalance, WifiPayments });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error reading data: ' + error });
    }
};


