"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const posLimits_controller_1 = require("../controllers/posLimits.controller");
const router = (0, express_1.Router)();
router.get("/", posLimits_controller_1.getPosLimits);
router.put("/:posKey", posLimits_controller_1.upsertPosLimit);
exports.default = router;
