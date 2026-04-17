"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_routes_1 = __importDefault(require("./products.routes"));
const offers_routes_1 = __importDefault(require("./offers.routes"));
const categories_routes_1 = __importDefault(require("./categories.routes"));
const brands_routes_1 = __importDefault(require("./brands.routes"));
const banners_routes_1 = __importDefault(require("./banners.routes"));
const router = (0, express_1.Router)();
router.use("/products", products_routes_1.default);
router.use("/offers", offers_routes_1.default);
router.use("/categories", categories_routes_1.default);
router.use("/brands", brands_routes_1.default);
router.use("/banners", banners_routes_1.default);
exports.default = router;
