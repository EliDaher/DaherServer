"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportedTransactions_controller_1 = require("../controllers/reportedTransactions.controller");
const router = (0, express_1.Router)();
router.get("/", reportedTransactions_controller_1.getReportedTransactions);
router.post("/", reportedTransactions_controller_1.createReportedTransaction);
router.delete("/:id", reportedTransactions_controller_1.deleteReportedTransaction);
exports.default = router;
