import { Router } from "express";
import { addPendingExchange } from "../controllers/exchange.controller";

const router = Router();

router.post("/addPendingExchange", addPendingExchange);


export default router;
