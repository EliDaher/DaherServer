"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profitLogs_controller_1 = require("../controllers/profitLogs.controller");
const router = (0, express_1.Router)();
router.post("/pos", profitLogs_controller_1.createPosProfitLog);
router.get("/pos", profitLogs_controller_1.getPosProfitLogs);
exports.default = router;
