import { Router } from "express";
import { getCustomers } from "../controllers/wifi.controller";

const router = Router();

router.get("/getCustomers", getCustomers);

export default router;
