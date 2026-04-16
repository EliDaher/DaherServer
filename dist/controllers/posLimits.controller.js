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
exports.upsertPosLimit = exports.getPosLimits = void 0;
const { ref, get, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const POS_LIMITS_NODE = "posBalanceLimits";
const INVALID_FIREBASE_KEY_CHARS = /[.#$/\[\]]/g;
function sanitizePosKey(value) {
    return value.trim().replace(INVALID_FIREBASE_KEY_CHARS, "_");
}
function toNonNegativeNumber(value) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0) {
        return null;
    }
    return normalized;
}
function isValidUpdatedBy(value) {
    return typeof value === "string" && value.trim().length > 0;
}
const getPosLimits = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limitsRef = ref(database, POS_LIMITS_NODE);
        const snapshot = yield get(limitsRef);
        if (!snapshot.exists()) {
            return res.status(200).json({ limits: [] });
        }
        const rawLimits = snapshot.val();
        const limits = Object.entries(rawLimits).map(([posKey, value]) => {
            var _a;
            return ({
                posKey,
                minBalance: (_a = toNonNegativeNumber(value === null || value === void 0 ? void 0 : value.minBalance)) !== null && _a !== void 0 ? _a : 0,
                updatedAt: typeof (value === null || value === void 0 ? void 0 : value.updatedAt) === "string" && value.updatedAt
                    ? value.updatedAt
                    : new Date(0).toISOString(),
                updatedBy: typeof (value === null || value === void 0 ? void 0 : value.updatedBy) === "string" && value.updatedBy
                    ? value.updatedBy
                    : "unknown",
            });
        });
        limits.sort((a, b) => {
            const aTime = new Date(a.updatedAt).getTime();
            const bTime = new Date(b.updatedAt).getTime();
            return bTime - aTime;
        });
        return res.status(200).json({ limits });
    }
    catch (error) {
        console.error("Error fetching POS limits:", error);
        return res.status(500).json({ error: "Failed to fetch POS limits" });
    }
});
exports.getPosLimits = getPosLimits;
const upsertPosLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const normalizedParam = String(req.params.posKey || "");
        const posKey = sanitizePosKey(normalizedParam);
        const minBalance = toNonNegativeNumber((_a = req.body) === null || _a === void 0 ? void 0 : _a.minBalance);
        const updatedBy = (_b = req.body) === null || _b === void 0 ? void 0 : _b.updatedBy;
        if (!posKey) {
            return res.status(400).json({ message: "Invalid posKey" });
        }
        if (minBalance === null) {
            return res.status(400).json({
                message: "Invalid minBalance. Expected a non-negative number.",
            });
        }
        if (!isValidUpdatedBy(updatedBy)) {
            return res.status(400).json({
                message: "Invalid updatedBy. Expected a non-empty string.",
            });
        }
        const record = {
            posKey,
            minBalance,
            updatedAt: new Date().toISOString(),
            updatedBy: updatedBy.trim(),
        };
        const targetRef = ref(database, `${POS_LIMITS_NODE}/${posKey}`);
        yield set(targetRef, record);
        return res.status(200).json({
            success: true,
            data: record,
        });
    }
    catch (error) {
        console.error("Error upserting POS limit:", error);
        return res.status(500).json({ error: "Failed to upsert POS limit" });
    }
});
exports.upsertPosLimit = upsertPosLimit;
