import { Router } from "express";
import { addDoneExchange, addPendingExchange, deleteDoneExchange, deletePendingExchange, getDoneExchange, getPendingExchange } from "../controllers/exchange.controller";

const router = Router();

router.post("/addPending", addPendingExchange);
router.get("/getPending", getPendingExchange);
router.delete("/deletePending", deletePendingExchange);

router.post("/addDone", addDoneExchange);
router.get("/getDone", getDoneExchange);
router.delete("/deleteDone", deleteDoneExchange);


export default router;
