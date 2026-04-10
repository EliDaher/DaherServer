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

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function toFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toTimestamp(value: unknown) {
  if (!value) return 0;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function buildMonthDays(month: string) {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  const dailyUsage: Array<{ date: string; amount: number; count: number }> = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    dailyUsage.push({
      date: `${month}-${String(day).padStart(2, "0")}`,
      amount: 0,
      count: 0,
    });
  }

  return { dailyUsage, daysInMonth };
}

export const getCompanyDetails = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const queryMonth = req.query.month;

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const month =
      typeof queryMonth === "string" && queryMonth.trim() !== ""
        ? queryMonth.trim()
        : new Date().toISOString().slice(0, 7);

    if (!MONTH_PATTERN.test(month)) {
      return res
        .status(400)
        .json({ error: "Invalid month format. Expected YYYY-MM" });
    }

    const [companySnap, logsSnap] = await Promise.all([
      get(ref(database, `companies/${companyId}`)),
      get(ref(database, "balanceLogs")),
    ]);

    if (!companySnap.exists()) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company = companySnap.val() || {};
    const logsByDate = logsSnap.exists() ? logsSnap.val() : {};

    const { dailyUsage, daysInMonth } = buildMonthDays(month);
    const dayIndex = new Map(dailyUsage.map((item, index) => [item.date, index]));
    const recentUsageLogs: any[] = [];
    const recentIncreaseLogs: any[] = [];

    Object.keys(logsByDate).forEach((dateKey) => {
      if (!dateKey.startsWith(`${month}-`)) return;

      const dayLogs = logsByDate[dateKey] || {};
      Object.keys(dayLogs).forEach((logId) => {
        const log = dayLogs[logId];
        if (String(log.companyId || "") !== companyId) return;

        const logType = String(log.type || "");
        const amount = toFiniteNumber(log.amount);

        if (logType === "decrease") {
          const index = dayIndex.get(dateKey);
          if (index !== undefined) {
            dailyUsage[index].amount += amount;
            dailyUsage[index].count += 1;
          }

          recentUsageLogs.push({
            id: logId,
            dateKey,
            ...log,
            amount,
          });
        } else if (logType === "increase") {
          recentIncreaseLogs.push({
            id: logId,
            dateKey,
            ...log,
            amount,
          });
        }
      });
    });

    const totalSpentAmount = dailyUsage.reduce((sum, day) => sum + day.amount, 0);
    const operationsCount = dailyUsage.reduce((sum, day) => sum + day.count, 0);
    const averageDailySpent = daysInMonth > 0 ? totalSpentAmount / daysInMonth : 0;

    recentUsageLogs.sort((a, b) => {
      const aTime = toTimestamp(a.date) || toTimestamp(a.dateKey);
      const bTime = toTimestamp(b.date) || toTimestamp(b.dateKey);
      return bTime - aTime;
    });
    recentIncreaseLogs.sort((a, b) => {
      const aTime = toTimestamp(a.date) || toTimestamp(a.dateKey);
      const bTime = toTimestamp(b.date) || toTimestamp(b.dateKey);
      return bTime - aTime;
    });

    return res.status(200).json({
      company: {
        id: company.id || companyId,
        name: company.name || "",
        balance: toFiniteNumber(company.balance),
        balanceLimit: toFiniteNumber(company.balanceLimit),
        createdAt: company.createdAt || null,
        lastUpdate: company.lastUpdate || null,
      },
      month,
      summary: {
        totalSpentAmount,
        operationsCount,
        averageDailySpent,
      },
      dailyUsage,
      recentUsageLogs: recentUsageLogs.slice(0, 20),
      recentIncreaseLogs: recentIncreaseLogs.slice(0, 20),
    });
  } catch (error) {
    console.error("Error fetching company details:", error);
    return res.status(500).json({ error: "Failed to fetch company details" });
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
