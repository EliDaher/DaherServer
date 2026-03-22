import { Router } from "express";
import { getTotalDayBalance, getTotalBalance, getEmployeeBalanceTable, getDailyBalance, addMofadale, getEmployeesDashboard } from "../controllers/balance.controller";

const router = Router();

router.get("/getTotalDayBalance", getTotalDayBalance);

router.get("/getTotalBalance", getTotalBalance);

router.get("/getEmployeeBalanceTable", getEmployeeBalanceTable);

router.get("/getDailyBalance", getDailyBalance);

router.get("/employeesDashboard", getEmployeesDashboard);

router.post("/addMofadale", addMofadale);

export default router;
