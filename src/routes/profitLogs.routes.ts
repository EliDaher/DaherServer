import { Router } from "express";
import { createPosProfitLog, getPosProfitLogs } from "../controllers/profitLogs.controller";

const router = Router();

router.post("/pos", createPosProfitLog);
router.get("/pos", getPosProfitLogs);

export default router;
