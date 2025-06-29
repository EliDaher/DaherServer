import { Router } from "express";
import { getDebtAgingByBalance, getInvoicesWithStatus, getMonthlyRevenue } from "../controllers/report.controller";

const router = Router();


router.get("/monthly-revenue", getMonthlyRevenue);

router.get("/aging", getDebtAgingByBalance);

router.get("/invoices-status", getInvoicesWithStatus);


export default router;
