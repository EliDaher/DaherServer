import { Router } from "express";
import { createCompany, decreaseBalance, fixBalance, getAllCompaniesBalances, getCompanyDetails, getLogsByDate, increaseBalance } from "../controllers/companyBalance.controller";

const router = Router();

router.post("/", createCompany);

router.get("/", getAllCompaniesBalances);

router.get("/logs", getLogsByDate);

router.get("/:companyId/details", getCompanyDetails);

router.post("/increaseBalance", increaseBalance);

router.post("/decreaseBalance", decreaseBalance);

router.post("/fixBalance", fixBalance);

export default router;
