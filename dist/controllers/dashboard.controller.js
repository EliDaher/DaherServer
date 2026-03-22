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
exports.getDashboardStats = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const getDashboardStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, dashboard_service_1.getDashboardOverview)();
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error("Error generating dashboard stats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate dashboard data",
            error: (error === null || error === void 0 ? void 0 : error.message) || "Unknown error",
        });
    }
});
exports.getDashboardStats = getDashboardStats;
