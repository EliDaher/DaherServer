import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";

const router = Router();

router.get("/overview", getDashboardStats);

export default router;
