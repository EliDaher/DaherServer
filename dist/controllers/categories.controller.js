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
exports.deleteCategoryHandler = exports.updateCategoryActiveHandler = exports.updateCategoryHandler = exports.createCategoryHandler = exports.getCategory = exports.getCategories = void 0;
const categories_service_1 = require("../services/categories.service");
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
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = (0, categories_service_1.parseCategoryFilters)(req.query);
        const data = yield (0, categories_service_1.listCategories)(filters);
        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully",
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
exports.getCategories = getCategories;
const getCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield (0, categories_service_1.getCategoryById)(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Category fetched successfully",
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
exports.getCategory = getCategory;
const createCategoryHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const created = yield (0, categories_service_1.createCategory)(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Category created successfully",
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
exports.createCategoryHandler = createCategoryHandler;
const updateCategoryHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, categories_service_1.updateCategory)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
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
exports.updateCategoryHandler = updateCategoryHandler;
const updateCategoryActiveHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const updated = yield (0, categories_service_1.setCategoryActiveState)(req.params.id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.isActive);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Category active state updated successfully",
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
exports.updateCategoryActiveHandler = updateCategoryActiveHandler;
const deleteCategoryHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield (0, categories_service_1.deleteCategory)(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
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
exports.deleteCategoryHandler = deleteCategoryHandler;
