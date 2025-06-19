import { Request, Response } from "express";
const {
  ref,
  get,
  child,
  orderByChild,
  query,
  equalTo,
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
          note: invoicesData[key].Note || "",
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
          note: paymentsData[key].Note || "",
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



