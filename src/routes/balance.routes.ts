import { Router } from "express";
import { getTotalDayBalance } from "../controllers/balance.controller";

const router = Router();

router.get("/getTotalDayBalance", getTotalDayBalance);

export default router;
