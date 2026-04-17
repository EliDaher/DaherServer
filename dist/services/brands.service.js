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
exports.parseBrandFilters = parseBrandFilters;
exports.listBrands = listBrands;
exports.getBrandById = getBrandById;
exports.createBrand = createBrand;
exports.updateBrand = updateBrand;
exports.setBrandActiveState = setBrandActiveState;
exports.deleteBrand = deleteBrand;
const database_1 = require("firebase/database");
const storeValidation_service_1 = require("./storeValidation.service");
const { database } = require("../../firebaseConfig.js");
const BRANDS_PATH = "store/brands";
function normalizeBrand(raw) {
    return {
        id: String((raw === null || raw === void 0 ? void 0 : raw.id) || ""),
        name: String((raw === null || raw === void 0 ? void 0 : raw.name) || ""),
        logoUrl: String((raw === null || raw === void 0 ? void 0 : raw.logoUrl) || ""),
        sortOrder: Number((raw === null || raw === void 0 ? void 0 : raw.sortOrder) || 0),
        isActive: Boolean(raw === null || raw === void 0 ? void 0 : raw.isActive),
        createdAt: String((raw === null || raw === void 0 ? void 0 : raw.createdAt) || ""),
        updatedAt: String((raw === null || raw === void 0 ? void 0 : raw.updatedAt) || ""),
    };
}
function parseCreateInput(input) {
    var _a;
    return {
        name: (0, storeValidation_service_1.asRequiredString)(input.name, "name"),
        logoUrl: (0, storeValidation_service_1.asRequiredString)((_a = input.logoUrl) !== null && _a !== void 0 ? _a : "", "logoUrl", {
            allowEmpty: true,
        }),
        sortOrder: (0, storeValidation_service_1.asNonNegativeInteger)(input.sortOrder, "sortOrder"),
        isActive: (0, storeValidation_service_1.asBoolean)(input.isActive, "isActive"),
    };
}
function parseUpdateInput(input) {
    const payload = {};
    if (input.name !== undefined) {
        payload.name = (0, storeValidation_service_1.asRequiredString)(input.name, "name");
    }
    if (input.logoUrl !== undefined) {
        payload.logoUrl = (0, storeValidation_service_1.asRequiredString)(input.logoUrl, "logoUrl", {
            allowEmpty: true,
        });
    }
    if (input.sortOrder !== undefined) {
        payload.sortOrder = (0, storeValidation_service_1.asNonNegativeInteger)(input.sortOrder, "sortOrder");
    }
    if (input.isActive !== undefined) {
        payload.isActive = (0, storeValidation_service_1.asBoolean)(input.isActive, "isActive");
    }
    if (Object.keys(payload).length === 0) {
        throw new Error("VALIDATION:No valid fields were provided");
    }
    return payload;
}
function parseBrandFilters(query) {
    return {
        isActive: (0, storeValidation_service_1.toBooleanQuery)(query.isActive, "isActive"),
        search: typeof query.search === "string" ? query.search : undefined,
    };
}
function getById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemRef = (0, database_1.ref)(database, `${BRANDS_PATH}/${id}`);
        const snapshot = yield (0, database_1.get)(itemRef);
        if (!snapshot.exists()) {
            return null;
        }
        return normalizeBrand(snapshot.val());
    });
}
function listBrands() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        const listRef = (0, database_1.ref)(database, BRANDS_PATH);
        const snapshot = yield (0, database_1.get)(listRef);
        if (!snapshot.exists()) {
            return [];
        }
        const data = snapshot.val() || {};
        let records = Object.keys(data).map((id) => normalizeBrand(Object.assign({ id }, data[id])));
        if (filters.isActive !== undefined) {
            records = records.filter((item) => item.isActive === filters.isActive);
        }
        if (filters.search) {
            const term = filters.search.toLowerCase().trim();
            records = records.filter((item) => item.name.toLowerCase().includes(term));
        }
        records.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }
            return (new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime());
        });
        return records;
    });
}
function getBrandById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return getById(id);
    });
}
function createBrand(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsed = parseCreateInput(input);
        const now = (0, storeValidation_service_1.toIsoNow)();
        const listRef = (0, database_1.ref)(database, BRANDS_PATH);
        const newRef = (0, database_1.push)(listRef);
        const id = String(newRef.key || "");
        const payload = Object.assign(Object.assign({ id }, parsed), { createdAt: now, updatedAt: now });
        yield (0, database_1.set)(newRef, payload);
        return payload;
    });
}
function updateBrand(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const updatedFields = parseUpdateInput(input);
        const payload = Object.assign(Object.assign({}, updatedFields), { updatedAt: (0, storeValidation_service_1.toIsoNow)() });
        const itemRef = (0, database_1.ref)(database, `${BRANDS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function setBrandActiveState(id, isActive) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const parsed = (0, storeValidation_service_1.asBoolean)(isActive, "isActive");
        const payload = { isActive: parsed, updatedAt: (0, storeValidation_service_1.toIsoNow)() };
        const itemRef = (0, database_1.ref)(database, `${BRANDS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function deleteBrand(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return false;
        }
        const itemRef = (0, database_1.ref)(database, `${BRANDS_PATH}/${id}`);
        yield (0, database_1.remove)(itemRef);
        return true;
    });
}
