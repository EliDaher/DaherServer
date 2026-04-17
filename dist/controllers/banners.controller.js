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
exports.deleteBannerHandler = exports.updateBannerActiveHandler = exports.updateBannerHandler = exports.createBannerHandler = exports.getBanner = exports.getBanners = void 0;
const banners_service_1 = require("../services/banners.service");
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
const getBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = (0, banners_service_1.parseBannerFilters)(req.query);
        const data = yield (0, banners_service_1.listBanners)(filters);
        return res.status(200).json({
            success: true,
            message: "Banners fetched successfully",
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
exports.getBanners = getBanners;
const getBanner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield (0, banners_service_1.getBannerById)(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Banner fetched successfully",
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
exports.getBanner = getBanner;
const createBannerHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const created = yield (0, banners_service_1.createBanner)(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Banner created successfully",
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
exports.createBannerHandler = createBannerHandler;
const updateBannerHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, banners_service_1.updateBanner)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
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
exports.updateBannerHandler = updateBannerHandler;
const updateBannerActiveHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const updated = yield (0, banners_service_1.setBannerActiveState)(req.params.id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.isActive);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Banner active state updated successfully",
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
exports.updateBannerActiveHandler = updateBannerActiveHandler;
const deleteBannerHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield (0, banners_service_1.deleteBanner)(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully",
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
exports.deleteBannerHandler = deleteBannerHandler;
