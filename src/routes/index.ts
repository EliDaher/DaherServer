import { Router } from "express";
import authRoutes from "./auth.routes";
import wifiRoutes from "./wifi.routes";
import reportRoutes from "./reports.routes";
import balanceRoutes from "./balance.routes"

const router = Router();

router.use("/auth", authRoutes);

router.use("/wifi", wifiRoutes);

router.use("/reports", reportRoutes);

router.use("/balance", balanceRoutes);

export default router;
