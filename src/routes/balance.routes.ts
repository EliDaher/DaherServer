import { Router } from "express";
import { getTotalDayBalance, getTotalBalance, getEmployeeBalanceTable } from "../controllers/balance.controller";

const router = Router();

router.get("/getTotalDayBalance", getTotalDayBalance);

router.get("/getTotalBalance", getTotalBalance);

router.get("/getEmployeeBalanceTable", getEmployeeBalanceTable);

export default router;
