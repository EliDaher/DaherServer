"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ports_controller_1 = require("../controllers/ports.controller");
const router = (0, express_1.Router)();
router.get("/", ports_controller_1.getportsOperations);
exports.default = router;
