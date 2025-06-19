import { Router } from "express";
import { getCustomerById, getCustomers, getTransactionsForCustomer } from "../controllers/wifi.controller";

const router = Router();

router.get("/getCustomers", getCustomers);

router.get("/getCustomerById/:id", getCustomerById);

router.get("/getTransactionsForCustomer/:subscriberID", getTransactionsForCustomer);

export default router;
