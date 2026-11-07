import { Request, Response } from "express";
import { applyReportChange, normalizeReport, ReportError } from "../services/reportedTransactions";
const { ref, get, push, runTransaction } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

function failure(res: Response, error: unknown) {
  if (error instanceof ReportError) return res.status(error.status).json({ success: false, message: error.message });
  console.error("Reported transaction error:", error);
  return res.status(500).json({ success: false, message: "Failed to save or load reported transaction" });
}
export const getReportedTransactions = async (_req: Request, res: Response) => {
  try {
    const snapshot = await get(ref(database, "reportedTransactions"));
    const data = Object.entries(snapshot.val() || {}).map(([id, record]) => {
      const { history, ...report } = normalizeReport(id, record as any);
      return report;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json({ success: true, data });
  } catch (error) { return failure(res, error); }
};
async function save(req: Request, res: Response, creating: boolean) {
  try {
    const root = ref(database, "reportedTransactions");
    const id = creating ? push(root).key : req.params.id;
    if (!id || /[.#$\[\]\/]/.test(id)) throw new ReportError(400, "Invalid report id");
    const eventId = push(root).key;
    const timestamp = new Date().toISOString();
    await get(root); // Prime the transaction cache before validating existing records.
    const result = await runTransaction(root, (records: any) => {
      return applyReportChange(records || {}, id, req.body || {}, creating, timestamp, eventId);
    }, { applyLocally: false });
    const { history, ...data } = normalizeReport(id, result.snapshot.child(id).val());
    return res.status(creating ? 201 : 200).json({ success: true, data });
  } catch (error) { return failure(res, error); }
}
export const createReportedTransaction = (req: Request, res: Response) => save(req, res, true);
export const updateReportedTransaction = (req: Request, res: Response) => save(req, res, false);
export const getReportedTransactionHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id || /[.#$\[\]\/]/.test(id)) throw new ReportError(400, "Invalid report id");
    const snapshot = await get(ref(database, `reportedTransactions/${id}`));
    if (!snapshot.exists()) throw new ReportError(404, "Report not found");
    const report = normalizeReport(id, snapshot.val());
    return res.json({ success: true, data: Object.values(report.history).sort((a: any, b: any) => b.at.localeCompare(a.at)) });
  } catch (error) { return failure(res, error); }
};
export const deleteReportedTransaction = (_req: Request, res: Response) =>
  res.status(405).json({ success: false, message: "Reports are preserved. Mark the report done instead." });
