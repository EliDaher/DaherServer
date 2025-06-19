import { Router } from "express";
import { getCustomerById, getCustomers, getTransactionsForCustomer } from "../controllers/wifi.controller";

const router = Router();

router.get("/getCustomers", getCustomers);

router.get("/getCustomerById", getCustomerById);

router.get("/getTransactionsForCustomer", getTransactionsForCustomer);

export default router;
