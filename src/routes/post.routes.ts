import { Router } from "express";
import { getportsOperations } from "../controllers/ports.controller";

const router = Router();

router.get("/", getportsOperations);

export default router;
