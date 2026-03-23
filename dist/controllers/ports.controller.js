"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getportsOperations = exports.addPortOprationInternal = void 0;
const ports_service_1 = require("../services/ports.service");
const addPortOprationInternal = (_a) => __awaiter(void 0, [_a], void 0, function* ({ executorName, operationType, note, }) {
    return (0, ports_service_1.addPortOperation)({ executorName, operationType, note });
});
exports.addPortOprationInternal = addPortOprationInternal;
const getportsOperations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromDate, toDate, executorName } = req.query;
        const operations = yield (0, ports_service_1.getportsOperations)({
            fromDate,
            toDate,
            executorName,
        });
        return res.status(200).json({
            success: true,
            count: operations.length,
            operations,
        });
    }
    catch (error) {
        console.error("getportsOperations controller error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch ports operations",
        });
    }
});
exports.getportsOperations = getportsOperations;
