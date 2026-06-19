import { Router } from "express";
import { getTotalDayBalance, getTotalBalance, getEmployeeBalanceTable, getDailyBalance, addMofadale, getEmployeesDashboard, addBillInvoice, getBillCategoryTotals, getElectricityTransactions, updateElectricityTransactionReviewed } from "../controllers/balance.controller";

const router = Router();

router.get("/getTotalDayBalance", getTotalDayBalance);

router.get("/getTotalBalance", getTotalBalance);

router.get("/getEmployeeBalanceTable", getEmployeeBalanceTable);

router.get("/getDailyBalance", getDailyBalance);

router.get("/employeesDashboard", getEmployeesDashboard);

router.post("/addBillInvoice", addBillInvoice);

router.get("/getBillCategoryTotals", getBillCategoryTotals);

router.get("/electricityTransactions", getElectricityTransactions);

router.patch("/electricityTransactions/:id", updateElectricityTransactionReviewed);

router.post("/addMofadale", addMofadale);

export default router;
