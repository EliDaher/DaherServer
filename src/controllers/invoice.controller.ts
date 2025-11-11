import { Request, Response } from "express";
import { ref, get } from "firebase/database";
const { database } = require("../../firebaseConfig.js");

export const searchInvoices = async (req: Request, res: Response) => {
  const { searchValue } = req.body;

  if (!searchValue) {
    return res.status(400).json({ error: "Search value is required" });
  }

  try {
    const dbRef = ref(database, "dailyTotal");
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "No data found" });
    }

    const results: any[] = [];

    snapshot.forEach((dateSnapshot) => {
      const date = dateSnapshot.key;

      dateSnapshot.forEach((employeeSnapshot) => {
        const employee = employeeSnapshot.key;

        employeeSnapshot.forEach((invoiceSnapshot) => {
          const invoice = invoiceSnapshot.key;
          const invoiceData = invoiceSnapshot.val();

          // تأكد من أن details كائن فعلاً
          if (
            invoiceData &&
            invoiceData.details &&
            typeof invoiceData.details === "object"
          ) {
            Object.values(invoiceData.details).forEach((detail: any) => {
              const customerDetails =
                detail.customerDetails?.toString().toLowerCase() || "";
              const search = searchValue.toString().toLowerCase();

              if (
                detail.customerNumber?.toString() === searchValue ||
                customerDetails.includes(search) ||
                detail.invoiceNumber?.toString().includes(search)
              ) {
                results.push({
                  date,
                  employee,
                  invoice,
                  amount: invoiceData.amount,
                  matchingDetail: detail,
                });
              }
            });
          }
        });
      });
    });

    return res.json(
      results.length > 0 ? results : { message: "No matching data found" }
    );
  } catch (error: any) {
    console.error("Error searching invoices:", error);
    return res.status(500).json({ error: error.message });
  }
};
