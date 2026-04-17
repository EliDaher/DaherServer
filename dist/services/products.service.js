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
exports.parseProductFilters = parseProductFilters;
exports.listProducts = listProducts;
exports.getProductById = getProductById;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.updateProductPrices = updateProductPrices;
exports.updateProductStock = updateProductStock;
exports.setProductPublishState = setProductPublishState;
exports.deleteProduct = deleteProduct;
const database_1 = require("firebase/database");
const storeValidation_service_1 = require("./storeValidation.service");
const { database } = require("../../firebaseConfig.js");
const PRODUCTS_PATH = "store/products";
function parseProductType(value, fieldName) {
    if (value !== "product" && value !== "service") {
        throw new Error(`VALIDATION:${fieldName} must be "product" or "service"`);
    }
    return value;
}
function normalizeProduct(raw) {
    return {
        id: (0, storeValidation_service_1.asOptionalString)(raw === null || raw === void 0 ? void 0 : raw.id),
        name: (0, storeValidation_service_1.asLocalizedOptional)(raw === null || raw === void 0 ? void 0 : raw.name, "name"),
        description: (0, storeValidation_service_1.asLocalizedOptional)(raw === null || raw === void 0 ? void 0 : raw.description, "description"),
        type: (raw === null || raw === void 0 ? void 0 : raw.type) === "service" ? "service" : "product",
        imageUrl: (0, storeValidation_service_1.asOptionalString)(raw === null || raw === void 0 ? void 0 : raw.imageUrl),
        priceSell: Number((raw === null || raw === void 0 ? void 0 : raw.priceSell) || 0),
        priceCost: Number((raw === null || raw === void 0 ? void 0 : raw.priceCost) || 0),
        priceWholesale: Number((raw === null || raw === void 0 ? void 0 : raw.priceWholesale) || 0),
        stock: Number((raw === null || raw === void 0 ? void 0 : raw.stock) || 0),
        categoryId: (0, storeValidation_service_1.asOptionalString)(raw === null || raw === void 0 ? void 0 : raw.categoryId),
        brandId: (0, storeValidation_service_1.asOptionalString)(raw === null || raw === void 0 ? void 0 : raw.brandId),
        isPublished: Boolean(raw === null || raw === void 0 ? void 0 : raw.isPublished),
        isFeatured: Boolean(raw === null || raw === void 0 ? void 0 : raw.isFeatured),
        createdAt: (0, storeValidation_service_1.asOptionalString)(raw === null || raw === void 0 ? void 0 : raw.createdAt),
        updatedAt: (0, storeValidation_service_1.asOptionalString)(raw === null || raw === void 0 ? void 0 : raw.updatedAt),
    };
}
function parseCreateInput(input) {
    var _a, _b, _c;
    return {
        name: (0, storeValidation_service_1.asLocalizedRequired)(input.name, "name"),
        description: (0, storeValidation_service_1.asLocalizedRequired)(input.description, "description"),
        type: parseProductType(input.type, "type"),
        imageUrl: (0, storeValidation_service_1.asRequiredString)((_a = input.imageUrl) !== null && _a !== void 0 ? _a : "", "imageUrl", {
            allowEmpty: true,
        }),
        priceSell: (0, storeValidation_service_1.asNonNegativeNumber)(input.priceSell, "priceSell"),
        priceCost: (0, storeValidation_service_1.asNonNegativeNumber)(input.priceCost, "priceCost"),
        priceWholesale: (0, storeValidation_service_1.asNonNegativeNumber)(input.priceWholesale, "priceWholesale"),
        stock: (0, storeValidation_service_1.asNonNegativeNumber)(input.stock, "stock"),
        categoryId: (0, storeValidation_service_1.asRequiredString)((_b = input.categoryId) !== null && _b !== void 0 ? _b : "", "categoryId", {
            allowEmpty: true,
        }),
        brandId: (0, storeValidation_service_1.asRequiredString)((_c = input.brandId) !== null && _c !== void 0 ? _c : "", "brandId", { allowEmpty: true }),
        isPublished: (0, storeValidation_service_1.asBoolean)(input.isPublished, "isPublished"),
        isFeatured: (0, storeValidation_service_1.asBoolean)(input.isFeatured, "isFeatured"),
    };
}
function parseUpdateInput(input) {
    const payload = {};
    if (input.name !== undefined) {
        payload.name = (0, storeValidation_service_1.asLocalizedRequired)(input.name, "name");
    }
    if (input.description !== undefined) {
        payload.description = (0, storeValidation_service_1.asLocalizedRequired)(input.description, "description");
    }
    if (input.type !== undefined) {
        payload.type = parseProductType(input.type, "type");
    }
    if (input.imageUrl !== undefined) {
        payload.imageUrl = (0, storeValidation_service_1.asRequiredString)(input.imageUrl, "imageUrl", {
            allowEmpty: true,
        });
    }
    if (input.priceSell !== undefined) {
        payload.priceSell = (0, storeValidation_service_1.asNonNegativeNumber)(input.priceSell, "priceSell");
    }
    if (input.priceCost !== undefined) {
        payload.priceCost = (0, storeValidation_service_1.asNonNegativeNumber)(input.priceCost, "priceCost");
    }
    if (input.priceWholesale !== undefined) {
        payload.priceWholesale = (0, storeValidation_service_1.asNonNegativeNumber)(input.priceWholesale, "priceWholesale");
    }
    if (input.stock !== undefined) {
        payload.stock = (0, storeValidation_service_1.asNonNegativeNumber)(input.stock, "stock");
    }
    if (input.categoryId !== undefined) {
        payload.categoryId = (0, storeValidation_service_1.asRequiredString)(input.categoryId, "categoryId", {
            allowEmpty: true,
        });
    }
    if (input.brandId !== undefined) {
        payload.brandId = (0, storeValidation_service_1.asRequiredString)(input.brandId, "brandId", {
            allowEmpty: true,
        });
    }
    if (input.isPublished !== undefined) {
        payload.isPublished = (0, storeValidation_service_1.asBoolean)(input.isPublished, "isPublished");
    }
    if (input.isFeatured !== undefined) {
        payload.isFeatured = (0, storeValidation_service_1.asBoolean)(input.isFeatured, "isFeatured");
    }
    if (Object.keys(payload).length === 0) {
        throw new Error("VALIDATION:No valid fields were provided");
    }
    return payload;
}
function getById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemRef = (0, database_1.ref)(database, `${PRODUCTS_PATH}/${id}`);
        const snapshot = yield (0, database_1.get)(itemRef);
        if (!snapshot.exists()) {
            return null;
        }
        return normalizeProduct(snapshot.val());
    });
}
function parseProductFilters(query) {
    const typeRaw = query.type;
    const parsedType = typeRaw === undefined ? undefined : parseProductType(typeRaw, "type");
    return {
        search: typeof query.search === "string" ? query.search : undefined,
        type: parsedType,
        categoryId: typeof query.categoryId === "string" ? query.categoryId : undefined,
        brandId: typeof query.brandId === "string" ? query.brandId : undefined,
        isPublished: (0, storeValidation_service_1.toBooleanQuery)(query.isPublished, "isPublished"),
        inStock: (0, storeValidation_service_1.toBooleanQuery)(query.inStock, "inStock"),
    };
}
function listProducts() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        const rootRef = (0, database_1.ref)(database, PRODUCTS_PATH);
        const snapshot = yield (0, database_1.get)(rootRef);
        if (!snapshot.exists()) {
            return [];
        }
        const data = snapshot.val() || {};
        let products = Object.keys(data).map((id) => normalizeProduct(Object.assign({ id }, data[id])));
        if (filters.search) {
            const term = filters.search.trim().toLowerCase();
            products = products.filter((item) => {
                const text = `${item.name.ar} ${item.name.en} ${item.description.ar} ${item.description.en}`.toLowerCase();
                return text.includes(term);
            });
        }
        if (filters.type) {
            products = products.filter((item) => item.type === filters.type);
        }
        if (filters.categoryId) {
            products = products.filter((item) => item.categoryId === filters.categoryId);
        }
        if (filters.brandId) {
            products = products.filter((item) => item.brandId === filters.brandId);
        }
        if (filters.isPublished !== undefined) {
            products = products.filter((item) => item.isPublished === filters.isPublished);
        }
        if (filters.inStock === true) {
            products = products.filter((item) => item.stock > 0);
        }
        if (filters.inStock === false) {
            products = products.filter((item) => item.stock <= 0);
        }
        products.sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });
        return products;
    });
}
function getProductById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return getById(id);
    });
}
function createProduct(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsed = parseCreateInput(input);
        const now = (0, storeValidation_service_1.toIsoNow)();
        const listRef = (0, database_1.ref)(database, PRODUCTS_PATH);
        const newRef = (0, database_1.push)(listRef);
        const id = String(newRef.key || "");
        const payload = Object.assign(Object.assign({ id }, parsed), { createdAt: now, updatedAt: now });
        yield (0, database_1.set)(newRef, payload);
        return payload;
    });
}
function updateProduct(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const updatedFields = parseUpdateInput(input);
        const payload = Object.assign(Object.assign({}, updatedFields), { updatedAt: (0, storeValidation_service_1.toIsoNow)() });
        const itemRef = (0, database_1.ref)(database, `${PRODUCTS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function updateProductPrices(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const payload = {};
        if (input.priceSell !== undefined) {
            payload.priceSell = (0, storeValidation_service_1.asNonNegativeNumber)(input.priceSell, "priceSell");
        }
        if (input.priceCost !== undefined) {
            payload.priceCost = (0, storeValidation_service_1.asNonNegativeNumber)(input.priceCost, "priceCost");
        }
        if (input.priceWholesale !== undefined) {
            payload.priceWholesale = (0, storeValidation_service_1.asNonNegativeNumber)(input.priceWholesale, "priceWholesale");
        }
        if (Object.keys(payload).length === 0) {
            throw new Error("VALIDATION:At least one price field is required");
        }
        payload.updatedAt = (0, storeValidation_service_1.toIsoNow)();
        const itemRef = (0, database_1.ref)(database, `${PRODUCTS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function updateProductStock(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const hasStock = input.stock !== undefined;
        const hasDelta = input.delta !== undefined;
        if (!hasStock && !hasDelta) {
            throw new Error("VALIDATION:Either stock or delta must be provided");
        }
        if (hasStock && hasDelta) {
            throw new Error("VALIDATION:Provide either stock or delta, not both");
        }
        const nextStock = hasStock
            ? (0, storeValidation_service_1.asNonNegativeNumber)(input.stock, "stock")
            : existing.stock + Number(input.delta);
        if (!Number.isFinite(nextStock) || nextStock < 0) {
            throw new Error("VALIDATION:Resulting stock must be greater than or equal to 0");
        }
        const payload = {
            stock: nextStock,
            updatedAt: (0, storeValidation_service_1.toIsoNow)(),
        };
        const itemRef = (0, database_1.ref)(database, `${PRODUCTS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function setProductPublishState(id, isPublished) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return null;
        }
        const parsed = (0, storeValidation_service_1.asBoolean)(isPublished, "isPublished");
        const payload = { isPublished: parsed, updatedAt: (0, storeValidation_service_1.toIsoNow)() };
        const itemRef = (0, database_1.ref)(database, `${PRODUCTS_PATH}/${id}`);
        yield (0, database_1.update)(itemRef, payload);
        return Object.assign(Object.assign({}, existing), payload);
    });
}
function deleteProduct(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getById(id);
        if (!existing) {
            return false;
        }
        const itemRef = (0, database_1.ref)(database, `${PRODUCTS_PATH}/${id}`);
        yield (0, database_1.remove)(itemRef);
        return true;
    });
}
