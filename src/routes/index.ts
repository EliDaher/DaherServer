import { Router } from "express";
import authRoutes from "./auth.routes";
import wifiRoutes from "./wifi.routes"

const router = Router();

router.use("/auth", authRoutes);

router.use("/wifi", wifiRoutes);

export default router;
