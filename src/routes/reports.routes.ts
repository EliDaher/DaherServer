import { Router } from "express";
import { fixWrongNumberInvoices, getDebtAgingByBalance, getInquiryLogs, getInvoicesWithStatus, getMonthlyRevenue, listDuplicateInvoices, listWrongNumberInvoices, removeDuplicateInvoices } from "../controllers/report.controller";

const router = Router();


router.get("/monthly-revenue", getMonthlyRevenue);

router.get("/aging", getDebtAgingByBalance);

router.get("/invoices-status", getInvoicesWithStatus);

router.get("/listDuplicateInvoices", listDuplicateInvoices);

router.get("/removeDuplicateInvoices", removeDuplicateInvoices);

router.get("/listWrongNumberInvoices", listWrongNumberInvoices);

router.get("/fixWrongNumberInvoices", fixWrongNumberInvoices);

router.get("/InquiryLogs", getInquiryLogs);


export default router;
