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
exports.parseOfferFilters = parseOfferFilters;
exports.listOffers = listOffers;
exports.getOfferById = getOfferById;
exports.createOffer = createOffer;
exports.updateOffer = updateOffer;
exports.setOfferActiveState = setOfferActiveState;
exports.deleteOffer = deleteOffer;
const database_1 = require("firebase/database");
const storeValidation_service_1 = require("./storeValidation.service");
const { database } = require("../../firebaseConfig.js");
const OFFERS_PATH = "store/offers";
function normalizeOffer(raw) {
    return {
        id: String((raw === null || raw === void 0 ? void 0 : raw.id) || ""),
        title: (0, storeValidation_service_1.asLocalizedRequired)((raw === null || raw === void 0 ? void 0 : raw.title) || { ar: "", en: "" }, "title"),
        description: (0, storeValidation_service_1.asLocalizedRequired)((raw === null || raw === void 0 ? void 0 : raw.description) || { ar: "", en: "" }, "description"),
        imageUrl: String((raw === null || raw === void 0 ? void 0 : raw.imageUrl) || ""),
        startsAt: String((raw === null || raw === void 0 ? void 0 : raw.startsAt) || ""),
        endsAt: String((raw === null || raw === void 0 ? void 0 : raw.endsAt) || ""),
        isActive: Boolean(raw === null || raw === void 0 ? void 0 : raw.isActive),
        productId: String((raw === null || raw === void 0 ? void 0 : raw.productId) || ""),
        categoryId: String((raw === null || raw === void 0 ? void 0 : raw.categoryId) || ""),
        createdAt: String((raw === null || raw === void 0 ? void 0 : raw.createdAt) || ""),
        updatedAt: String((raw === null || raw === void 0 ? void 0 : raw.updatedAt) || ""),
    };
}
function parseCreateInput(input) {
    var _a, _b, _c;
    const startsAt = (0, storeValidation_service_1.asOptionalDateIso)(input.startsAt, "startsAt");
    const endsAt = (0, storeValidation_service_1.asOptionalDateIso)(input.endsAt, "endsAt");
    (0, storeValidation_service_1.ensureDateRange)(startsAt, endsAt);
    return {
        title: (0, storeValidation_service_1.asLocalizedRequired)(input.title, "title"),
        description: (0, storeValidation_service_1.asLocalizedRequired)(input.description, "description"),
        imageUrl: (0, storeValidation_service_1.asRequiredString)((_a = input.imageUrl) !== null && _a !== void 0 ? _a : "", "imageUrl", {
            allowEmpty: true,
        }),
        startsAt,
        endsAt,
        isActive: (0, storeValidation_service_1.asBoolean)(input.isActive, "isActive"),
        productId: (0, storeValidation_service_1.asRequiredString)((_b = input.productId) !== null && _b !== void 0 ? _b : "", "productId", {
            allowEmpty: true,
        }),
        categoryId: (0, storeValidation_service_1.asRequiredString)((_c = input.categoryId) !== null && _c !== void 0 ? _c : "", "categoryId", {
            allowEmpty: true,
        }),
    };
}
function parseUpdateInput(input) {
    const payload = {};
    if (input.title !== undefined) {
        payload.title = (0, storeValidation_service_1.asLocalizedRequired)(input.title, "title");
    }
    if (input.description !== undefined) {
        payload.description = (0, storeValidation_service_1.asLocalizedRequired)(input.description, "description");
    }
    if (input.imageUrl !== undefined) {
        payload.imageUrl = (0, storeValidation_service_1.asRequiredString)(input.imageUrl, "imageUrl", {
            allowEmpty: true,
        });
    }
    if (input.startsAt !== undefined) {
        payload.startsAt = (0, storeValidation_service_1.asOptionalDateIso)(input.startsAt, "startsAt");
    }
    if (input.endsAt !== undefined) {
        payload.endsAt = (0, storeValidation_service_1.asOptionalDateIso)(input.endsAt, "endsAt");
    }
    if (input.isActive !== undefined) {
        payload.isActive = (0, storeValidation_service_1.asBoolean)(input.isActive, "isActive");
    }
    if (input.productId !== undefined) {
        payload.productId = (0, storeValidation_service_1.asRequiredString)(input.productId, "productId", {
            allowEmpty: true,
        });
    }
    if (input.categoryId !== undefined) {
        payload.categoryId = (0, storeValidation_service_1.asRequiredString)(input.categoryId, "categoryId", {
            allowEmpty: true,
        });
    }
    if (Object.keys(payload).length === 0) {
        throw new Error("VALIDATION:No valid fields were provided");
    }
    (0, storeValidation_service_1.ensureDateRange)(payload.startsAt || "", payload.endsAt || "");
    return payload;
}
function parseOfferFilters(query) {
    return {
        isActive: (0, storeValidation_service_1.toBooleanQuery)(query.isActive, "isActive"),
        validNow: (0, storeValidation_service_1.toBooleanQuery)(query.validNow, "validNow"),
        productId: typeof query.productId === "string" ? query.productId : undefined,
        categoryId: typeof query.categoryId === "string" ? query.categoryId : undefined,
        search: typeof query.search === "string" ? query.search : undefined,
    };
}
function getById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemRef = (0, database_1.ref)(database, `${OFFERS_PATH}/${id}`);
        const snapshot = yield (0, database_1.get)(itemRef);
        if (!snapshot.exists()) {
            return null;
        }
        return normalizeOffer(snapshot.val());
    });
}
function isOfferValidNow(record) {
    const now = Date.now();
    if (record.startsAt && new Date(record.startsAt).getTime() > now) {
        return false;
    }
    if (record.endsAt && new Date(record.endsAt).getTime() < now) {
        return false;
    }
    return true;
}
function listOffers() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        const rootRef = (0, database_1.ref)(database, OFFERS_PATH);
        const snapshot = yield (0, database_1.get)(rootRef);
        if (!snapshot.exists()) {
            return [];
        }
        const data = snapshot.val() || {};
        let records = Object.keys(data).map((id) => normalizeOffer(Object.assign({ id }, data[id])));
        if (filters.isActive !== undefined) {
            records = records.filter((item) => item.isActive === filters.isActive);
        }
        if (filters.validNow === true) {
            records = records.filter((item) => isOfferValidNow(item));
        }
        if (filters.productId) {
            records = records.filter((item) => item.productId === filters.productId);
        }
        if (filters.categoryId) {
            records = records.filter((item) => item.categoryId === filters.categoryId);
        }
        if (filters.search) {
            const term = filters.search.toLowerCase().trim();
            records = records.filter((item) => {
                const text = `${item.title.ar} ${item.title.en} ${item.description.ar} ${item.description.en}`.toLowerCase();
                return text.includes(term);
            });
        }
        records.sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });
        return records;
    });
}
function getOfferById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return getById(id);
    });
}
function createOffer(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsed = parseCreateInput(input);
        const now = (0, storeValidation_service_1.toIsoNow)();
        const listRef = (0, database_1.ref)(database, OFFERS_PATH);
        const newRef = (0, database_1.push)(listRef);
        const id = String(newRef.key || "");
        const payload = Object.assign(Object.assign({ id }, parsed), { createdAt: now, updatedAt: now });
        yield (0, database_1.set)(newRef, payload);
        return payload;
    });
}
function updateOffer(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const updatedFields = parseUpdateInput(input);
        const payload = Object.assign(Object.assign({}, updatedFields), { updatedAt: (0, storeValidation_service_1.toIsoNow)() });
        const itemRef = (0, database_1.ref)(database, `${OFFERS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function setOfferActiveState(id, isActive) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const parsed = (0, storeValidation_service_1.asBoolean)(isActive, "isActive");
        const payload = { isActive: parsed, updatedAt: (0, storeValidation_service_1.toIsoNow)() };
        const itemRef = (0, database_1.ref)(database, `${OFFERS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function deleteOffer(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return false;
        }
        const itemRef = (0, database_1.ref)(database, `${OFFERS_PATH}/${id}`);
        yield (0, database_1.remove)(itemRef);
        return true;
    });
}
