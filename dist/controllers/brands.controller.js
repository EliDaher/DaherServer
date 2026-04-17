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
exports.deleteBrandHandler = exports.updateBrandActiveHandler = exports.updateBrandHandler = exports.createBrandHandler = exports.getBrand = exports.getBrands = void 0;
const brands_service_1 = require("../services/brands.service");
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
const getBrands = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = (0, brands_service_1.parseBrandFilters)(req.query);
        const data = yield (0, brands_service_1.listBrands)(filters);
        return res.status(200).json({
            success: true,
            message: "Brands fetched successfully",
            data,
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
exports.getBrands = getBrands;
const getBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield (0, brands_service_1.getBrandById)(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Brand fetched successfully",
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
exports.getBrand = getBrand;
const createBrandHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const created = yield (0, brands_service_1.createBrand)(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Brand created successfully",
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
exports.createBrandHandler = createBrandHandler;
const updateBrandHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, brands_service_1.updateBrand)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Brand updated successfully",
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
exports.updateBrandHandler = updateBrandHandler;
const updateBrandActiveHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const updated = yield (0, brands_service_1.setBrandActiveState)(req.params.id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.isActive);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Brand active state updated successfully",
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
exports.updateBrandActiveHandler = updateBrandActiveHandler;
const deleteBrandHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield (0, brands_service_1.deleteBrand)(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully",
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
exports.deleteBrandHandler = deleteBrandHandler;
