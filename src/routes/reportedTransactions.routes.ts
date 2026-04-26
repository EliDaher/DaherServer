import { Router } from "express";
import {
  createReportedTransaction,
  deleteReportedTransaction,
  getReportedTransactions,
} from "../controllers/reportedTransactions.controller";

const router = Router();

router.get("/", getReportedTransactions);
router.post("/", createReportedTransaction);
router.delete("/:id", deleteReportedTransaction);

export default router;
