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
exports.deleteOfferHandler = exports.updateOfferActiveHandler = exports.updateOfferHandler = exports.createOfferHandler = exports.getOffer = exports.getOffers = void 0;
const offers_service_1 = require("../services/offers.service");
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
const getOffers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = (0, offers_service_1.parseOfferFilters)(req.query);
        const data = yield (0, offers_service_1.listOffers)(filters);
        return res.status(200).json({
            success: true,
            message: "Offers fetched successfully",
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
exports.getOffers = getOffers;
const getOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield (0, offers_service_1.getOfferById)(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Offer fetched successfully",
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
exports.getOffer = getOffer;
const createOfferHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const created = yield (0, offers_service_1.createOffer)(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Offer created successfully",
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
exports.createOfferHandler = createOfferHandler;
const updateOfferHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield (0, offers_service_1.updateOffer)(req.params.id, req.body || {});
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Offer updated successfully",
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
exports.updateOfferHandler = updateOfferHandler;
const updateOfferActiveHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const updated = yield (0, offers_service_1.setOfferActiveState)(req.params.id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.isActive);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Offer active state updated successfully",
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
exports.updateOfferActiveHandler = updateOfferActiveHandler;
const deleteOfferHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield (0, offers_service_1.deleteOffer)(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Offer deleted successfully",
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
exports.deleteOfferHandler = deleteOfferHandler;
