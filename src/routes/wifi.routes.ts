import { Router } from "express";
import { addCustomers, addInvoice, addPayment, getBalance, getCustomerById, getCustomers, getTransactionsForCustomer, updateCustomer, verifyAndFixBalances, verifyBalances } from "../controllers/wifi.controller";

const router = Router();

router.get("/getCustomers", getCustomers);

router.post("/addCustomer", addCustomers);

router.get("/getCustomerById/:id", getCustomerById);

router.get("/getTransactionsForCustomer/:subscriberID", getTransactionsForCustomer);

router.put("/updateCustomer/:id", updateCustomer);

router.post("/addPayment/", addPayment);

router.post("/addInvoice", addInvoice);

router.get('/getWifiBalance', getBalance);

router.get('/verifyAndFixBalances', verifyAndFixBalances);

router.get('/verifyBalances', verifyBalances);


export default router;
