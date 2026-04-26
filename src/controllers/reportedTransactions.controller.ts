import { Request, Response } from "express";

const { ref, get, push, set, remove } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

type ReportedTransactionRecord = {
  id: string;
  number: string;
  company: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
};

function toRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildMatchKey(number: string, company: string) {
  return `${number.trim()}::${company.trim().toLowerCase()}`;
}

function mapSnapshotToRecords(value: Record<string, any> | null | undefined) {
  if (!value) {
    return [];
  }

  return Object.entries(value).map(([id, record]: [string, any]) => ({
    id,
    number: String(record?.number || ""),
    company: String(record?.company || ""),
    note:
      typeof record?.note === "string" && record.note.trim()
        ? record.note.trim()
        : undefined,
    createdAt: String(record?.createdAt || ""),
    createdBy:
      typeof record?.createdBy === "string" && record.createdBy.trim()
        ? record.createdBy.trim()
        : undefined,
  }));
}

export const getReportedTransactions = async (_req: Request, res: Response) => {
  try {
    const snapshot = await get(ref(database, "reportedTransactions"));
    const records = mapSnapshotToRecords(snapshot.exists() ? snapshot.val() : null);

    records.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Error fetching reported transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reported transactions",
    });
  }
};

export const createReportedTransaction = async (req: Request, res: Response) => {
  try {
    const number = toRequiredString(req.body?.number);
    const company = toRequiredString(req.body?.company);
    const note = toRequiredString(req.body?.note);
    const createdBy = toRequiredString(req.body?.createdBy);

    if (!number || !company) {
      return res.status(400).json({
        success: false,
        message: "number and company are required",
      });
    }

    const rootRef = ref(database, "reportedTransactions");
    const snapshot = await get(rootRef);
    const existingRecords = mapSnapshotToRecords(
      snapshot.exists() ? snapshot.val() : null,
    );
    const incomingKey = buildMatchKey(number, company);
    const duplicate = existingRecords.some(
      (record) => buildMatchKey(record.number, record.company) === incomingKey,
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Reported transaction already exists",
      });
    }

    const newRecordRef = push(rootRef);
    const id = newRecordRef.key as string;
    const record: ReportedTransactionRecord = {
      id,
      number,
      company,
      ...(note ? { note } : {}),
      createdAt: new Date().toISOString(),
      ...(createdBy ? { createdBy } : {}),
    };

    await set(newRecordRef, record);

    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error creating reported transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create reported transaction",
    });
  }
};

export const deleteReportedTransaction = async (req: Request, res: Response) => {
  try {
    const id = toRequiredString(req.params?.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    await remove(ref(database, `reportedTransactions/${id}`));

    return res.status(200).json({
      success: true,
      message: "Reported transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting reported transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete reported transaction",
    });
  }
};
