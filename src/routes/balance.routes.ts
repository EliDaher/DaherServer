import { Router } from "express";
import { getTotalDayBalance, getTotalBalance, getEmployeeBalanceTable, getDailyBalance } from "../controllers/balance.controller";

const router = Router();

router.get("/getTotalDayBalance", getTotalDayBalance);

router.get("/getTotalBalance", getTotalBalance);

router.get("/getEmployeeBalanceTable", getEmployeeBalanceTable);

router.get("/getDailyBalance", getDailyBalance);

export default router;
