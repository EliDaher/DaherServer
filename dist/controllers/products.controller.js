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
exports.deleteProductHandler = exports.updateProductPricesHandler = exports.updateProductStockHandler = exports.updateProductHandler = exports.createProductHandler = exports.getProduct = exports.getProducts = void 0;
const products_service_1 = require("../services/products.service");
function getErrorResponse(error) {
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
function parseInStockQuery(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === "true" || value === true) {
        return true;
    }
    if (value === "false" || value === false) {
        return false;
    }
    throw new Error("VALIDATION:inStock must be true or false");
}
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = {
            search: typeof req.query.search === "string" ? req.query.search : undefined,
            category: typeof req.query.category === "string" ? req.query.category : undefined,
            inStock: parseInStockQuery(req.query.inStock),
        };
        const products = yield (0, products_service_1.listProducts)(filters);
        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: products,
        });
    }
    catch (error) {
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
        });
    }
});
exports.getProducts = getProducts;
const getProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield (0, products_service_1.getProductById)(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product fetched successfully",
            data: product,
        });
    }
    catch (error) {
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
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
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
        });
    }
});
exports.createProductHandler = createProductHandler;
const updateProductHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield (0, products_service_1.updateProduct)(id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
        });
    }
});
exports.updateProductHandler = updateProductHandler;
const updateProductStockHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield (0, products_service_1.updateProductStock)(id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product stock updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
        });
    }
});
exports.updateProductStockHandler = updateProductStockHandler;
const updateProductPricesHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield (0, products_service_1.updateProductPrices)(id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product prices updated successfully",
            data: updated,
        });
    }
    catch (error) {
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
        });
    }
});
exports.updateProductPricesHandler = updateProductPricesHandler;
const deleteProductHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleted = yield (0, products_service_1.deleteProduct)(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            data: { id },
        });
    }
    catch (error) {
        const parsed = getErrorResponse(error);
        return res.status(parsed.status).json({
            success: false,
            message: parsed.message,
        });
    }
});
exports.deleteProductHandler = deleteProductHandler;
