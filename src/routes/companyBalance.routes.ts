import { Router } from "express";
import { createCompany, decreaseBalance, getAllCompaniesBalances, getLogsByDate, increaseBalance } from "../controllers/companyBalance.controller";

const router = Router();

router.post("/", createCompany);

router.get("/", getAllCompaniesBalances);

router.get("/logs", getLogsByDate);

router.post("/increaseBalance", increaseBalance);

router.post("/decreaseBalance", decreaseBalance);

export default router;
