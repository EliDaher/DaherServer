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
exports.parseCategoryFilters = parseCategoryFilters;
exports.listCategories = listCategories;
exports.getCategoryById = getCategoryById;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.setCategoryActiveState = setCategoryActiveState;
exports.deleteCategory = deleteCategory;
const database_1 = require("firebase/database");
const storeValidation_service_1 = require("./storeValidation.service");
const { database } = require("../../firebaseConfig.js");
const CATEGORIES_PATH = "store/categories";
function normalizeCategory(raw) {
    return {
        id: String((raw === null || raw === void 0 ? void 0 : raw.id) || ""),
        label: (0, storeValidation_service_1.asLocalizedRequired)((raw === null || raw === void 0 ? void 0 : raw.label) || { ar: "", en: "" }, "label"),
        sortOrder: Number((raw === null || raw === void 0 ? void 0 : raw.sortOrder) || 0),
        isActive: Boolean(raw === null || raw === void 0 ? void 0 : raw.isActive),
        createdAt: String((raw === null || raw === void 0 ? void 0 : raw.createdAt) || ""),
        updatedAt: String((raw === null || raw === void 0 ? void 0 : raw.updatedAt) || ""),
    };
}
function parseCreateInput(input) {
    return {
        label: (0, storeValidation_service_1.asLocalizedRequired)(input.label, "label"),
        sortOrder: (0, storeValidation_service_1.asNonNegativeInteger)(input.sortOrder, "sortOrder"),
        isActive: (0, storeValidation_service_1.asBoolean)(input.isActive, "isActive"),
    };
}
function parseUpdateInput(input) {
    const payload = {};
    if (input.label !== undefined) {
        payload.label = (0, storeValidation_service_1.asLocalizedRequired)(input.label, "label");
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
function parseCategoryFilters(query) {
    return {
        isActive: (0, storeValidation_service_1.toBooleanQuery)(query.isActive, "isActive"),
        search: typeof query.search === "string" ? query.search : undefined,
    };
}
function getById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemRef = (0, database_1.ref)(database, `${CATEGORIES_PATH}/${id}`);
        const snapshot = yield (0, database_1.get)(itemRef);
        if (!snapshot.exists()) {
            return null;
        }
        return normalizeCategory(snapshot.val());
    });
}
function listCategories() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        const listRef = (0, database_1.ref)(database, CATEGORIES_PATH);
        const snapshot = yield (0, database_1.get)(listRef);
        if (!snapshot.exists()) {
            return [];
        }
        const data = snapshot.val() || {};
        let records = Object.keys(data).map((id) => normalizeCategory(Object.assign({ id }, data[id])));
        if (filters.isActive !== undefined) {
            records = records.filter((item) => item.isActive === filters.isActive);
        }
        if (filters.search) {
            const term = filters.search.toLowerCase().trim();
            records = records.filter((item) => {
                const text = `${item.label.ar} ${item.label.en}`.toLowerCase();
                return text.includes(term);
            });
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
function getCategoryById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return getById(id);
    });
}
function createCategory(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsed = parseCreateInput(input);
        const now = (0, storeValidation_service_1.toIsoNow)();
        const listRef = (0, database_1.ref)(database, CATEGORIES_PATH);
        const newRef = (0, database_1.push)(listRef);
        const id = String(newRef.key || "");
        const payload = Object.assign(Object.assign({ id }, parsed), { createdAt: now, updatedAt: now });
        yield (0, database_1.set)(newRef, payload);
        return payload;
    });
}
function updateCategory(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const updatedFields = parseUpdateInput(input);
        const payload = Object.assign(Object.assign({}, updatedFields), { updatedAt: (0, storeValidation_service_1.toIsoNow)() });
        const itemRef = (0, database_1.ref)(database, `${CATEGORIES_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function setCategoryActiveState(id, isActive) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const parsed = (0, storeValidation_service_1.asBoolean)(isActive, "isActive");
        const payload = { isActive: parsed, updatedAt: (0, storeValidation_service_1.toIsoNow)() };
        const itemRef = (0, database_1.ref)(database, `${CATEGORIES_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function deleteCategory(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return false;
        }
        const itemRef = (0, database_1.ref)(database, `${CATEGORIES_PATH}/${id}`);
        yield (0, database_1.remove)(itemRef);
        return true;
    });
}
