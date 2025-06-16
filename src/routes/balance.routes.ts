import { Router } from "express";
import { getTotalDayBalance, getTotalBalance } from "../controllers/balance.controller";

const router = Router();

router.get("/getTotalDayBalance", getTotalDayBalance);

router.get("/getTotalBalance", getTotalBalance);

export default router;
