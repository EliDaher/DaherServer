import { Router } from "express";
import { addInvoice, addPayment, getCustomerById, getCustomers, getTransactionsForCustomer, updateCustomer } from "../controllers/wifi.controller";

const router = Router();

router.get("/getCustomers", getCustomers);

router.get("/getCustomerById/:id", getCustomerById);

router.get("/getTransactionsForCustomer/:subscriberID", getTransactionsForCustomer);

router.put("/updateCustomer/:id", updateCustomer);

router.post("/addPayment/", addPayment);

router.post("/addInvoice", addInvoice);

export default router;
