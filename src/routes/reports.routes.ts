import { Router } from "express";
import { getDebtAgingByBalance, getInvoicesWithStatus, getMonthlyRevenue, listDuplicateInvoices, listWrongNumberInvoices, removeDuplicateInvoices } from "../controllers/report.controller";

const router = Router();


router.get("/monthly-revenue", getMonthlyRevenue);

router.get("/aging", getDebtAgingByBalance);

router.get("/invoices-status", getInvoicesWithStatus);

router.get("/listDuplicateInvoices", listDuplicateInvoices);

router.get("/removeDuplicateInvoices", removeDuplicateInvoices);

router.get("/listWrongNumberInvoices", listWrongNumberInvoices);


export default router;
