import { Router } from "express";
import authRoutes from "./auth.routes";
import wifiRoutes from "./wifi.routes";
import reportRoutes from "./reports.routes";
import balanceRoutes from "./balance.routes"
import dealerRoutes from "./dealer.routes"

const router = Router();

router.use("/auth", authRoutes);

router.use("/wifi", wifiRoutes);

router.use("/reports", reportRoutes);

router.use("/balance", balanceRoutes);

router.use("/dealer", dealerRoutes);

export default router;
