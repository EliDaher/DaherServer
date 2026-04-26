import { Router } from "express";
import authRoutes from "./auth.routes";
import wifiRoutes from "./wifi.routes";
import reportRoutes from "./reports.routes";
import balanceRoutes from "./balance.routes"
import dealerRoutes from "./dealer.routes"
import exchangeRoutes from "./exchange.routes"
import invoicesRoutes from "./invoice.routes"
import companiesRoutes from "./companyBalance.routes"
import dashboardRoutes from "./dashboard.routes"
import portsRoutes from "./post.routes";
import posLimitsRoutes from "./posLimits.routes";
import profitLogsRoutes from "./profitLogs.routes";
import storeRoutes from "./store.routes";
import reportedTransactionsRoutes from "./reportedTransactions.routes";

const router = Router();

router.use("/auth", authRoutes);

router.use("/wifi", wifiRoutes);

router.use("/reports", reportRoutes);

router.use("/balance", balanceRoutes);

router.use("/dealer", dealerRoutes);

router.use("/exchange", exchangeRoutes);

router.use("/invoices", invoicesRoutes);

router.use("/company", companiesRoutes);

router.use("/dashboard", dashboardRoutes);

router.use("/ports", portsRoutes);

router.use("/pos-limits", posLimitsRoutes);

router.use("/profit-logs", profitLogsRoutes);

router.use("/store", storeRoutes);

router.use("/reported-transactions", reportedTransactionsRoutes);

export default router;
