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
exports.deleteProductHandler = exports.updateProductPublishHandler = exports.updateProductPricesHandler = exports.updateProductStockHandler = exports.updateProductHandler = exports.createProductHandler = exports.getProduct = exports.getProducts = void 0;
const products_service_1 = require("../services/products.service");
function errorToResponse(error) {
    if (error instanceof Error) {
        if (error.message.startsWith("VALIDATION:")) {
            return {
                status: 400,
                message: error.message.replace("VALIDATION:", "").trim(),
            };
        }
        return { status: 500, message: error.message };
    }
    return { status: 500, message: "Unexpected server error" };
}
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = (0, products_service_1.parseProductFilters)(req.query);
        const records = yield (0, products_service_1.listProducts)(filters);
        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: records,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.getProducts = getProducts;
const getProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield (0, products_service_1.getProductById)(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product fetched successfully",
            data: item,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.getProduct = getProduct;
const createProductHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const created = yield (0, products_service_1.createProduct)(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: created,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.createProductHandler = createProductHandler;
const updateProductHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, products_service_1.updateProduct)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.updateProductHandler = updateProductHandler;
const updateProductStockHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, products_service_1.updateProductStock)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product stock updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.updateProductStockHandler = updateProductStockHandler;
const updateProductPricesHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, products_service_1.updateProductPrices)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product prices updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.updateProductPricesHandler = updateProductPricesHandler;
const updateProductPublishHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const updated = yield (0, products_service_1.setProductPublishState)(req.params.id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.isPublished);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product publish state updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.updateProductPublishHandler = updateProductPublishHandler;
const deleteProductHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield (0, products_service_1.deleteProduct)(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            data: { id: req.params.id },
        });
    }
    catch (error) {
        const parsed = errorToResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
            data: null,
        });
    }
});
exports.deleteProductHandler = deleteProductHandler;
