import { Router } from "express";
import { AddSigSamer, fixWrongNumberInvoices, getDebtAgingByBalance, getInquiryLogs, getInvoicesWithStatus, getMonthlyRevenue, getSignatures, listDuplicateInvoices, listWrongNumberInvoices, removeDuplicateInvoices } from "../controllers/report.controller";

const router = Router();


router.get("/monthly-revenue", getMonthlyRevenue);

router.get("/aging", getDebtAgingByBalance);

router.get("/invoices-status", getInvoicesWithStatus);

router.get("/listDuplicateInvoices", listDuplicateInvoices);

router.get("/removeDuplicateInvoices", removeDuplicateInvoices);

router.get("/listWrongNumberInvoices", listWrongNumberInvoices);

router.get("/fixWrongNumberInvoices", fixWrongNumberInvoices);

router.get("/InquiryLogs", getInquiryLogs);

router.get("/getAllSignatures", getSignatures);

router.post("/addSignature", AddSigSamer);


export default router;
