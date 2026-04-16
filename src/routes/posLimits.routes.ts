import { Router } from "express";
import { getPosLimits, upsertPosLimit } from "../controllers/posLimits.controller";

const router = Router();

router.get("/", getPosLimits);
router.put("/:posKey", upsertPosLimit);

export default router;
