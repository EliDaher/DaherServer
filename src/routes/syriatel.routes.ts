import { Router } from "express";
import { getSyriatelBalance, rechargeSyriatel } from "../controllers/syriatel.controller";

const router = Router();

router.post("/recharge", rechargeSyriatel);
router.get("/balance", getSyriatelBalance);

export default router;
