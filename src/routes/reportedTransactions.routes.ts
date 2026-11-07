import { Router } from "express";
import {
  createReportedTransaction,
  deleteReportedTransaction,
  getReportedTransactions,
  updateReportedTransaction,
  getReportedTransactionHistory,
} from "../controllers/reportedTransactions.controller";

const router = Router();

router.get("/", getReportedTransactions);
router.post("/", createReportedTransaction);
router.patch("/:id", updateReportedTransaction);
router.get("/:id/history", getReportedTransactionHistory);
router.delete("/:id", deleteReportedTransaction);

export default router;
