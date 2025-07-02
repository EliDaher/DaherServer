import { Router } from "express";
import { getDebtAgingByBalance, getInvoicesWithStatus, getMonthlyRevenue, listDuplicateInvoices, removeDuplicateInvoices } from "../controllers/report.controller";

const router = Router();


router.get("/monthly-revenue", getMonthlyRevenue);

router.get("/aging", getDebtAgingByBalance);

router.get("/invoices-status", getInvoicesWithStatus);

router.get("/listDuplicateInvoices", listDuplicateInvoices);

router.get("/removeDuplicateInvoices", removeDuplicateInvoices);


export default router;
