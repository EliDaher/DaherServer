import { Request, Response } from "express";
import { ref, get } from "firebase/database";
const { database } = require("../../firebaseConfig.js");

export const searchInvoices = async (req: Request, res: Response) => {
  const { searchValue } = req.body;

  if (!searchValue || !searchValue.toString().trim()) {
    return res.status(400).json({ error: "Search value is required" });
  }

  try {
    const dbRef = ref(database, "dailyTotal");
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "No data found" });
    }

    const results: any[] = [];
    const search = searchValue.toString().toLowerCase().trim();

    snapshot.forEach((dateSnap) => {
      const date = dateSnap.key;

      dateSnap.forEach((employeeSnap) => {
        const employee = employeeSnap.key;

        employeeSnap.forEach((invoiceSnap) => {
          const invoiceData = invoiceSnap.val();

          if (
            invoiceData &&
            invoiceData.details &&
            typeof invoiceData.details === "object"
          ) {
            Object.values(invoiceData.details).forEach((detail: any) => {
              const name = detail.customerName?.toLowerCase() || "";
              const details = detail.customerDetails?.toLowerCase() || "";
              const number = detail.customerNumber?.toString() || "";
              const invoiceNumber = detail.invoiceNumber?.toString() || "";

              if (
                name.includes(search) ||
                details.includes(search) ||
                number.includes(search) ||
                invoiceNumber.includes(search)
              ) {
                results.push({
                  date,
                  employee,
                  invoiceData, // يحتوي كل التفاصيل بما فيها details وamount وtimestamp
                });
              }
            });
          }
        });
      });
    });

    if (results.length === 0) {
      return res.status(404).json({ message: "No matching data found" });
    }

    return res.json(results);
  } catch (error: any) {
    console.error("Error searching invoices:", error);
    return res.status(500).json({ error: error.message });
  }
};
