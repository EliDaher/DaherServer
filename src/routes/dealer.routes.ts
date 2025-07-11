import { Router } from "express";
import addPayment from "../controllers/dealer.controller";

const router = Router();

router.post("/addPayment", addPayment);

export default router;
