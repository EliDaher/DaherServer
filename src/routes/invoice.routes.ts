import { Router } from "express";
import { searchInvoices } from "../controllers/invoice.controller";

const router = Router();

router.post("/searchInvoices", searchInvoices);


export default router;
