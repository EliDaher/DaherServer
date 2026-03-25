import { Request, Response } from "express";
import { Company } from "../types/company";
import { addPortOprationInternal } from "./ports.controller";
import { updateCompanyBalance } from "../services/companies.service";
import { createBalanceLog } from "../services/balance.service";
const { ref, get, child, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, initialBalance, balanceLimit } = req.body;

    const companiesRef = ref(database, "companies");
    const newCompanyRef = push(companiesRef);
    const newCompanyData: Company = {
      name,
      balance: initialBalance || 0,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      id: newCompanyRef.key,
      balanceLimit,
    };
    await set(newCompanyRef, newCompanyData);

    res
      .status(201)
      .json({ message: "Company created successfully", success: true });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
};

export const decreaseBalance = async (req: Request, res: Response) => {
  try {
    const { amount, reason, company, number, companyId, port } = req.body;
    const date = new Date().toISOString().split("T")[0];

    if (companyId != "") {
      const companyData = await updateCompanyBalance({ companyId, amount: Number(-amount) });

      if (companyData.error) {
        return res.status(404).json(companyData.error);
      }

      const balanceLogsRef = ref(database, `balanceLogs/${date}`);
      const newLogRef = push(balanceLogsRef);
      await set(newLogRef, {
        type: "decrease",
        amount,
        reason,
        company,
        companyId,
        number,
        port,
        beforeBalance: companyData.beforeBalance,
        afterBalance: companyData.afterBalance,
        date: new Date().toISOString(),
      });
    }

    addPortOprationInternal({
      executorName: port,
      operationType: "POSInvoice",
      note: `فاتورة انترنت للرقم ${number} في شركة ${company} بقيمة ${amount}`,
    });

    res
      .status(200)
      .json({ message: "Balance decreased successfully", success: true });
  } catch (error) {
    console.error("Error decreasing balance:", error);
    res.status(500).json({ error: "Failed to decrease balance" });
  }
};

export const increaseBalance = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      reason,
      company,
      number,
      companyId,
      port,
      paidAmount,
      paymentNote,
    } = req.body;
    const date = new Date().toISOString().split("T")[0];

    if (!companyId || typeof amount !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid companyId or amount",
      });
    }

    const companyData = await updateCompanyBalance({ companyId, amount });

    await createBalanceLog({
      type: "increase",
      amount,
      reason,
      company,
      number,
      port,
      beforeBalance: companyData.beforeBalance,
      afterBalance: companyData.afterBalance,
    });

    if (paidAmount && Number(paidAmount) > 0) {
      const InvoiceRef = ref(database, `dailyTotal/${date}/mahal`);
      const newInvoiceRef = push(InvoiceRef);

      await set(newInvoiceRef, {
        amount: Number(-paidAmount),
        details: {
          customerDetails: paymentNote || "هرم رصيد",
          customerName: port || "mahal",
          customerNumber: "0",
          invoiceNumber: "0",
          invoiceValue: Number(-paidAmount),
        },
        employee: port || "mahal",
        timestamp: date,
      });
    }

    try {
      await addPortOprationInternal({
        executorName: port,
        operationType: "CompanyIncrease",
        note: `زيادة رصيد في شركة ${company} بقيمة ${amount}`,
      });
    } catch (internalError) {
      console.error("addPortOprationInternal error:", internalError);
    }

    return res.status(200).json({
      success: true,
      message: "Balance increased successfully",
      data: {
        beforeBalance: companyData.beforeBalance,
        afterBalance: companyData.afterBalance,
      },
    });
  } catch (error: any) {
    console.error("increaseBalance controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to increase balance",
    });
  }
};

export const getAllCompaniesBalances = async (req: Request, res: Response) => {
  try {
    const companiesRef = ref(database, "companies");
    const snapshot = await get(companiesRef);
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No companies found" });
    }
    const companies: Company[] = snapshot.val();
    res.status(200).json({ companies });
  } catch (error) {
    console.error("Error fetching company balances:", error);
    res.status(500).json({ error: "Failed to fetch company balances" });
  }
};

export const getLogsByDate = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query as {
      fromDate?: string;
      toDate?: string;
    };

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: "fromDate and toDate are required" });
    }

    const logsRef = ref(database, `balanceLogs`);
    const snapshot = await get(logsRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No logs found" });
    }

    const logs = snapshot.val();
    const result: any[] = [];

    Object.keys(logs).forEach((dateKey) => {
      if (dateKey >= fromDate && dateKey <= toDate) {
        const dayLogs = logs[dateKey];

        Object.keys(dayLogs).forEach((logId) => {
          result.push({
            id: logId,
            dateKey,
            ...dayLogs[logId],
          });
        });
      }
    });

    res.status(200).json({
      count: result.length,
      logs: result,
    });
  } catch (error) {
    console.error("Error fetching company logs:", error);
    res.status(500).json({ error: "Failed to fetch company logs" });
  }
};

export const fixBalance = async (req: Request, res: Response) => {
  try {
    const { amount, reason, company, number, companyId, port } = req.body;

    if (!companyId || typeof amount !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid companyId or amount",
      });
    }

    const companyData = await updateCompanyBalance({
      companyId,
      amount,
    });

    await createBalanceLog({
      amount,
      reason,
      company,
      number,
      port,
      type: "fix",
      beforeBalance: companyData.beforeBalance,
      afterBalance: companyData.afterBalance,
    });

    try {
      await addPortOprationInternal({
        executorName: port,
        operationType: "FixBalance",
        note: `تصحيح رصيد في شركة ${company} بقيمة ${amount}`,
      });
    } catch (internalError) {
      console.error("addPortOprationInternal error:", internalError);
    }

    return res.status(200).json({
      success: true,
      message: "تم تصحيح الرصيد بنجاح",
      data: {
        beforeBalance: companyData.beforeBalance,
        afterBalance: companyData.afterBalance,
      },
    });
  } catch (error: any) {
    console.error("fixBalance controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "فشل في تصحيح الرصيد",
    });
  }
};