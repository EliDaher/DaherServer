import { Request, Response } from "express";

const { ref, get, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

const PROFIT_RATE = 0.05;

type PosProfitLogRecord = {
  id: string;
  invoiceId: string;
  amount: number;
  profitRate: number;
  profitAmount: number;
  company?: string;
  email?: string;
  number?: string;
  operator?: string;
  source: "pending_transactions";
  operationState?: string;
  createdAt: string;
  dateKey: string;
};

type PosProfitLogsResponse = {
  logs: PosProfitLogRecord[];
  summary: {
    totalProfitAmount: number;
    totalAmount: number;
    count: number;
  };
};

function toPositiveNumber(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateKey(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function toLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 200;
  return Math.min(Math.floor(parsed), 2000);
}

export const getPosProfitLogs = async (req: Request, res: Response) => {
  try {
    const fromDate = toDateKey(req.query?.fromDate);
    const toDate = toDateKey(req.query?.toDate);
    const limit = toLimit(req.query?.limit);

    if ((req.query?.fromDate && !fromDate) || (req.query?.toDate && !toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Expected YYYY-MM-DD",
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be greater than toDate",
      });
    }

    const rootRef = ref(database, "profitLogs/posInvoices");
    const snapshot = await get(rootRef);

    if (!snapshot.exists()) {
      const payload: PosProfitLogsResponse = {
        logs: [],
        summary: {
          totalProfitAmount: 0,
          totalAmount: 0,
          count: 0,
        },
      };

      return res.status(200).json({
        success: true,
        data: payload,
      });
    }

    const logsByDate = snapshot.val() as Record<
      string,
      Record<string, Partial<PosProfitLogRecord>>
    >;

    const allFilteredLogs: PosProfitLogRecord[] = [];

    Object.keys(logsByDate).forEach((dateKey) => {
      if (fromDate && dateKey < fromDate) return;
      if (toDate && dateKey > toDate) return;

      const dayLogs = logsByDate[dateKey] || {};
      Object.keys(dayLogs).forEach((logId) => {
        const raw = dayLogs[logId] || {};
        const amount = Number(raw.amount || 0);
        const profitAmount = Number(raw.profitAmount || 0);

        allFilteredLogs.push({
          id: String(raw.id || logId),
          invoiceId: String(raw.invoiceId || ""),
          amount,
          profitRate: Number(raw.profitRate || PROFIT_RATE),
          profitAmount,
          company: toOptionalString(raw.company),
          email: toOptionalString(raw.email),
          number: toOptionalString(raw.number),
          operator: toOptionalString(raw.operator),
          source: "pending_transactions",
          operationState: toOptionalString(raw.operationState),
          createdAt: String(raw.createdAt || `${dateKey}T00:00:00.000Z`),
          dateKey: String(raw.dateKey || dateKey),
        });
      });
    });

    const totalProfitAmount = allFilteredLogs.reduce(
      (sum, item) => sum + Number(item.profitAmount || 0),
      0,
    );
    const totalAmount = allFilteredLogs.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const sortedLogs = [...allFilteredLogs].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const payload: PosProfitLogsResponse = {
      logs: sortedLogs.slice(0, limit),
      summary: {
        totalProfitAmount,
        totalAmount,
        count: allFilteredLogs.length,
      },
    };

    return res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error("Error fetching POS profit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch POS profit logs",
    });
  }
};

export const createPosProfitLog = async (req: Request, res: Response) => {
  try {
    const invoiceId = toOptionalString(req.body?.invoiceId);
    const amount = toPositiveNumber(req.body?.amount);
    const source = req.body?.source;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "invoiceId is required",
      });
    }

    if (amount === null) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number",
      });
    }

    if (source !== "pending_transactions") {
      return res.status(400).json({
        success: false,
        message: 'source must be "pending_transactions"',
      });
    }

    const createdAt = new Date().toISOString();
    const dateKey = createdAt.split("T")[0];
    const profitAmount = Number((amount * PROFIT_RATE).toFixed(2));
    const logsRef = ref(database, `profitLogs/posInvoices/${dateKey}`);
    const newLogRef = push(logsRef);
    const id = newLogRef.key as string;

    const record: PosProfitLogRecord = {
      id,
      invoiceId,
      amount,
      profitRate: PROFIT_RATE,
      profitAmount,
      company: toOptionalString(req.body?.company),
      email: toOptionalString(req.body?.email),
      number: toOptionalString(req.body?.number),
      operator: toOptionalString(req.body?.operator),
      source,
      operationState: toOptionalString(req.body?.operationState),
      createdAt,
      dateKey,
    };

    await set(newLogRef, record);

    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error creating POS profit log:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create POS profit log",
    });
  }
};
