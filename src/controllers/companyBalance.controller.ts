import { Request, Response } from "express";
import { Company } from "../types/company";
import { addPortOprationInternal } from "./ports.controller";
const { ref, get, child, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const createCompany = async (req: Request, res: Response) => {
    try {
        const { name, initialBalance, balanceLimit } = req.body;

        const companiesRef = ref(database, 'companies');
        const newCompanyRef = push(companiesRef);
        const newCompanyData: Company = {
          name,
          balance: initialBalance || 0,
          createdAt: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          id: newCompanyRef.key,
          balanceLimit
        };
        await set(newCompanyRef, newCompanyData);

        res.status(201).json({ message: "Company created successfully", success: true });
    } catch (error) {
        console.error("Error creating company:", error);
        res.status(500).json({ error: "Failed to create company" });
    }
};

export const decreaseBalance = async (req: Request, res: Response) => {
    
    try {

        const { amount, reason, company, number, companyId, port } = req.body;
        const date = new Date().toISOString().split("T")[0];
        
        const companiesRef = ref(database, `companies/${companyId}`);

        const snapshot = await get(companiesRef);
        if (!snapshot.exists()) {
            return res.status(404).json({ error: "Company not found" });
        }

        const companyData: Company = snapshot.val();
        const currentBalance = companyData.balance || 0;
        const newBalance = currentBalance - amount;

        await set(companiesRef, {
          ...companyData,
          balance: newBalance,
          lastUpdate: new Date().toISOString(),
        });

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
            beforeBalance: companyData.balance,
            afterBalance: newBalance,
            date: new Date().toISOString(),
        });

        addPortOprationInternal(
            {
                executorName: '',
                operationType: 'POSInvoice',
                note: `فاتورة انترنت للرقم ${number} في شركة ${company} بقيمة ${amount}`,
            }
        );

        res.status(200).json({ message: "Balance decreased successfully", success: true });

    } catch (error) {
        console.error("Error decreasing balance:", error);
        res.status(500).json({ error: "Failed to decrease balance" });
    }
}

export const increaseBalance = async (req: Request, res: Response) => {
    
    try {
        const { amount, reason, company, number, companyId, port, paidAmount, paymentNote } = req.body;
        const date = new Date().toISOString().split("T")[0];

        const companiesRef = ref(database, `companies/${companyId}`);
        const snapshot = await get(companiesRef);
        if (!snapshot.exists()) {
            return res.status(404).json({ error: "Company not found" });
        }

        const companyData = snapshot.val();
        const currentBalance = companyData.balance || 0;
        const newBalance = currentBalance + amount;

        await set(companiesRef, { ...companyData, balance: newBalance, lastUpdate: new Date().toISOString() });

        const balanceLogsRef = ref(database, `balanceLogs/${date}`);
        const newLogRef = push(balanceLogsRef);
        await set(newLogRef, {
            type: "increase",
            amount,
            reason,
            company,
            number,
            port,
            beforeBalance: companyData.balance,
            afterBalance: newBalance,
            date: new Date().toISOString(),
        });


        if (paidAmount && paidAmount > 0) {
            const InvoiceRef = ref(database, `dailyTotal/${date}/mahal`);
            const newInvoiceRef = push(InvoiceRef);

            await set(newInvoiceRef, {
              amount: Number(amount),
              employee: 'mahal',
              details: paymentNote || `ايداع رصيد ${company}`,
              date: date,
              timeStamp: new Date().toISOString(),
            });
        }

          res
            .status(200)
            .json({ message: "Balance increased successfully", success: true });

    } catch (error) {
        console.error("Error increasing balance:", error);
        res.status(500).json({ error: "Failed to increase balance" });
    }
}

export const getAllCompaniesBalances = async (req: Request, res: Response) => {
    try {
        const companiesRef = ref(database, 'companies');
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
}

export const getLogsByDate = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.body;

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
