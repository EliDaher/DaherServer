import { Router } from "express";
import { rechargeSyriatel } from "../controllers/syriatel.controller";

const router = Router();

router.post("/recharge", rechargeSyriatel);

export default router;
