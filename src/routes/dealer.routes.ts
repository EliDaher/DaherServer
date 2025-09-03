import { Router } from "express";
import addPayment, { getPayments } from "../controllers/dealer.controller";

const router = Router();

router.post("/addPayment", addPayment);

router.get("/getPayments", getPayments);

export default router;
