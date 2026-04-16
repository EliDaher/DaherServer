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
exports.listProducts = listProducts;
exports.getProductById = getProductById;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.updateProductStock = updateProductStock;
exports.updateProductPrices = updateProductPrices;
exports.deleteProduct = deleteProduct;
const database_1 = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
function throwValidation(message) {
    throw new Error(`VALIDATION:${message}`);
}
function requireString(value, field, options) {
    if (typeof value !== "string") {
        throwValidation(`${field} must be a string`);
    }
    const trimmed = value.trim();
    if (!(options === null || options === void 0 ? void 0 : options.allowEmpty) && !trimmed) {
        throwValidation(`${field} is required`);
    }
    return trimmed;
}
function requireNumber(value, field) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        throwValidation(`${field} must be a valid number`);
    }
    if (num < 0) {
        throwValidation(`${field} must be greater than or equal to 0`);
    }
    return num;
}
function normalizeProductInput(input) {
    const name = requireString(input.name, "name");
    const category = requireString(input.category, "category");
    const description = requireString(input.description, "description", {
        allowEmpty: true,
    });
    const imageUrl = requireString(input.imageUrl, "imageUrl", {
        allowEmpty: true,
    });
    const stock = requireNumber(input.stock, "stock");
    const priceSell = requireNumber(input.priceSell, "priceSell");
    const priceCost = requireNumber(input.priceCost, "priceCost");
    const priceWholesale = requireNumber(input.priceWholesale, "priceWholesale");
    return {
        name,
        category,
        description,
        imageUrl,
        stock,
        priceSell,
        priceCost,
        priceWholesale,
    };
}
function normalizeProductUpdateInput(input) {
    const payload = {};
    if (input.name !== undefined) {
        payload.name = requireString(input.name, "name");
    }
    if (input.category !== undefined) {
        payload.category = requireString(input.category, "category");
    }
    if (input.description !== undefined) {
        payload.description = requireString(input.description, "description", {
            allowEmpty: true,
        });
    }
    if (input.imageUrl !== undefined) {
        payload.imageUrl = requireString(input.imageUrl, "imageUrl", {
            allowEmpty: true,
        });
    }
    if (input.stock !== undefined) {
        payload.stock = requireNumber(input.stock, "stock");
    }
    if (input.priceSell !== undefined) {
        payload.priceSell = requireNumber(input.priceSell, "priceSell");
    }
    if (input.priceCost !== undefined) {
        payload.priceCost = requireNumber(input.priceCost, "priceCost");
    }
    if (input.priceWholesale !== undefined) {
        payload.priceWholesale = requireNumber(input.priceWholesale, "priceWholesale");
    }
    if (Object.keys(payload).length === 0) {
        throwValidation("No valid fields were provided");
    }
    return payload;
}
function normalizeProduct(product) {
    return {
        id: String(product.id || ""),
        name: String(product.name || ""),
        category: String(product.category || ""),
        description: String(product.description || ""),
        imageUrl: String(product.imageUrl || ""),
        stock: Number(product.stock || 0),
        priceSell: Number(product.priceSell || 0),
        priceCost: Number(product.priceCost || 0),
        priceWholesale: Number(product.priceWholesale || 0),
        createdAt: String(product.createdAt || ""),
        updatedAt: String(product.updatedAt || ""),
    };
}
function getProductRecordById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const productRef = (0, database_1.ref)(database, `products/${id}`);
        const snapshot = yield (0, database_1.get)(productRef);
        if (!snapshot.exists()) {
            return null;
        }
        return normalizeProduct(snapshot.val());
    });
}
function listProducts() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        const productsRef = (0, database_1.ref)(database, "products");
        const snapshot = yield (0, database_1.get)(productsRef);
        if (!snapshot.exists()) {
            return [];
        }
        const data = snapshot.val() || {};
        let products = Object.keys(data).map((key) => normalizeProduct(Object.assign({ id: key }, data[key])));
        if (filters.search) {
            const query = filters.search.trim().toLowerCase();
            products = products.filter((item) => {
                const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
                return haystack.includes(query);
            });
        }
        if (filters.category) {
            const category = filters.category.trim().toLowerCase();
            products = products.filter((item) => item.category.trim().toLowerCase() === category);
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
        return getProductRecordById(id);
    });
}
function createProduct(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalized = normalizeProductInput(input);
        const now = new Date().toISOString();
        const productsRef = (0, database_1.ref)(database, "products");
        const newProductRef = (0, database_1.push)(productsRef);
        const id = String(newProductRef.key || "");
        const payload = Object.assign(Object.assign({ id }, normalized), { createdAt: now, updatedAt: now });
        yield (0, database_1.set)(newProductRef, payload);
        return payload;
    });
}
function updateProduct(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getProductRecordById(id);
        if (!existing) {
            return null;
        }
        const updatedFields = normalizeProductUpdateInput(input);
        const updatedAt = new Date().toISOString();
        const productRef = (0, database_1.ref)(database, `products/${id}`);
        yield (0, database_1.update)(productRef, Object.assign(Object.assign({}, updatedFields), { updatedAt }));
        return Object.assign(Object.assign(Object.assign({}, existing), updatedFields), { updatedAt });
    });
}
function updateProductStock(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getProductRecordById(id);
        if (!existing) {
            return null;
        }
        const hasStock = input.stock !== undefined;
        const hasDelta = input.delta !== undefined;
        if (!hasStock && !hasDelta) {
            throwValidation("Either stock or delta must be provided");
        }
        if (hasStock && hasDelta) {
            throwValidation("Provide either stock or delta, not both");
        }
        const nextStock = hasStock
            ? requireNumber(input.stock, "stock")
            : Number(existing.stock) + Number(input.delta);
        if (!Number.isFinite(nextStock) || nextStock < 0) {
            throwValidation("Resulting stock must be greater than or equal to 0");
        }
        const updatedAt = new Date().toISOString();
        const productRef = (0, database_1.ref)(database, `products/${id}`);
        yield (0, database_1.update)(productRef, {
            stock: nextStock,
            updatedAt,
        });
        return Object.assign(Object.assign({}, existing), { stock: nextStock, updatedAt });
    });
}
function updateProductPrices(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getProductRecordById(id);
        if (!existing) {
            return null;
        }
        const payload = {};
        if (input.priceSell !== undefined) {
            payload.priceSell = requireNumber(input.priceSell, "priceSell");
        }
        if (input.priceCost !== undefined) {
            payload.priceCost = requireNumber(input.priceCost, "priceCost");
        }
        if (input.priceWholesale !== undefined) {
            payload.priceWholesale = requireNumber(input.priceWholesale, "priceWholesale");
        }
        if (Object.keys(payload).length === 0) {
            throwValidation("At least one price field is required");
        }
        const updatedAt = new Date().toISOString();
        const productRef = (0, database_1.ref)(database, `products/${id}`);
        yield (0, database_1.update)(productRef, Object.assign(Object.assign({}, payload), { updatedAt }));
        return Object.assign(Object.assign(Object.assign({}, existing), payload), { updatedAt });
    });
}
function deleteProduct(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield getProductRecordById(id);
        if (!existing) {
            return false;
        }
        const productRef = (0, database_1.ref)(database, `products/${id}`);
        yield (0, database_1.remove)(productRef);
        return true;
    });
}
