import { get, push, ref, remove, set, update } from "firebase/database";
import {
  asBoolean,
  asLocalizedOptional,
  asLocalizedRequired,
  asNonNegativeNumber,
  asOptionalString,
  asRequiredString,
  toBooleanQuery,
  toIsoNow,
  type LocalizedText,
} from "./storeValidation.service";
const { database } = require("../../firebaseConfig.js");

const PRODUCTS_PATH = "store/products";

export type ProductType = "product" | "service";

export type ProductRecord = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  type: ProductType;
  imageUrl: string;
  priceSell: number;
  priceCost: number;
  priceWholesale: number;
  stock: number;
  categoryId: string;
  brandId: string;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductFilters = {
  search?: string;
  type?: ProductType;
  categoryId?: string;
  brandId?: string;
  isPublished?: boolean;
  inStock?: boolean;
};

type ProductInput = Partial<{
  name: unknown;
  description: unknown;
  type: unknown;
  imageUrl: unknown;
  priceSell: unknown;
  priceCost: unknown;
  priceWholesale: unknown;
  stock: unknown;
  categoryId: unknown;
  brandId: unknown;
  isPublished: unknown;
  isFeatured: unknown;
}>;

type PricesInput = Partial<{
  priceSell: unknown;
  priceCost: unknown;
  priceWholesale: unknown;
}>;

type StockInput = Partial<{
  stock: unknown;
  delta: unknown;
}>;

function parseProductType(value: unknown, fieldName: string): ProductType {
  if (value !== "product" && value !== "service") {
    throw new Error(`VALIDATION:${fieldName} must be "product" or "service"`);
  }

  return value;
}

function normalizeProduct(raw: any): ProductRecord {
  return {
    id: asOptionalString(raw?.id),
    name: asLocalizedOptional(raw?.name, "name"),
    description: asLocalizedOptional(raw?.description, "description"),
    type: raw?.type === "service" ? "service" : "product",
    imageUrl: asOptionalString(raw?.imageUrl),
    priceSell: Number(raw?.priceSell || 0),
    priceCost: Number(raw?.priceCost || 0),
    priceWholesale: Number(raw?.priceWholesale || 0),
    stock: Number(raw?.stock || 0),
    categoryId: asOptionalString(raw?.categoryId),
    brandId: asOptionalString(raw?.brandId),
    isPublished: Boolean(raw?.isPublished),
    isFeatured: Boolean(raw?.isFeatured),
    createdAt: asOptionalString(raw?.createdAt),
    updatedAt: asOptionalString(raw?.updatedAt),
  };
}

function parseCreateInput(input: ProductInput) {
  return {
    name: asLocalizedRequired(input.name, "name"),
    description: asLocalizedRequired(input.description, "description"),
    type: parseProductType(input.type, "type"),
    imageUrl: asRequiredString(input.imageUrl ?? "", "imageUrl", {
      allowEmpty: true,
    }),
    priceSell: asNonNegativeNumber(input.priceSell, "priceSell"),
    priceCost: asNonNegativeNumber(input.priceCost, "priceCost"),
    priceWholesale: asNonNegativeNumber(input.priceWholesale, "priceWholesale"),
    stock: asNonNegativeNumber(input.stock, "stock"),
    categoryId: asRequiredString(input.categoryId ?? "", "categoryId", {
      allowEmpty: true,
    }),
    brandId: asRequiredString(input.brandId ?? "", "brandId", { allowEmpty: true }),
    isPublished: asBoolean(input.isPublished, "isPublished"),
    isFeatured: asBoolean(input.isFeatured, "isFeatured"),
  };
}

function parseUpdateInput(input: ProductInput) {
  const payload: Partial<Omit<ProductRecord, "id" | "createdAt" | "updatedAt">> = {};

  if (input.name !== undefined) {
    payload.name = asLocalizedRequired(input.name, "name");
  }
  if (input.description !== undefined) {
    payload.description = asLocalizedRequired(input.description, "description");
  }
  if (input.type !== undefined) {
    payload.type = parseProductType(input.type, "type");
  }
  if (input.imageUrl !== undefined) {
    payload.imageUrl = asRequiredString(input.imageUrl, "imageUrl", {
      allowEmpty: true,
    });
  }
  if (input.priceSell !== undefined) {
    payload.priceSell = asNonNegativeNumber(input.priceSell, "priceSell");
  }
  if (input.priceCost !== undefined) {
    payload.priceCost = asNonNegativeNumber(input.priceCost, "priceCost");
  }
  if (input.priceWholesale !== undefined) {
    payload.priceWholesale = asNonNegativeNumber(input.priceWholesale, "priceWholesale");
  }
  if (input.stock !== undefined) {
    payload.stock = asNonNegativeNumber(input.stock, "stock");
  }
  if (input.categoryId !== undefined) {
    payload.categoryId = asRequiredString(input.categoryId, "categoryId", {
      allowEmpty: true,
    });
  }
  if (input.brandId !== undefined) {
    payload.brandId = asRequiredString(input.brandId, "brandId", {
      allowEmpty: true,
    });
  }
  if (input.isPublished !== undefined) {
    payload.isPublished = asBoolean(input.isPublished, "isPublished");
  }
  if (input.isFeatured !== undefined) {
    payload.isFeatured = asBoolean(input.isFeatured, "isFeatured");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("VALIDATION:No valid fields were provided");
  }

  return payload;
}

async function getById(id: string) {
  const itemRef = ref(database, `${PRODUCTS_PATH}/${id}`);
  const snapshot = await get(itemRef);
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeProduct(snapshot.val());
}

export function parseProductFilters(query: Record<string, unknown>): ProductFilters {
  const typeRaw = query.type;
  const parsedType =
    typeRaw === undefined ? undefined : parseProductType(typeRaw, "type");

  return {
    search: typeof query.search === "string" ? query.search : undefined,
    type: parsedType,
    categoryId: typeof query.categoryId === "string" ? query.categoryId : undefined,
    brandId: typeof query.brandId === "string" ? query.brandId : undefined,
    isPublished: toBooleanQuery(query.isPublished, "isPublished"),
    inStock: toBooleanQuery(query.inStock, "inStock"),
  };
}

export async function listProducts(filters: ProductFilters = {}) {
  const rootRef = ref(database, PRODUCTS_PATH);
  const snapshot = await get(rootRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  let products = Object.keys(data).map((id) =>
    normalizeProduct({ id, ...data[id] }),
  );

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
}

export async function getProductById(id: string) {
  return getById(id);
}

export async function createProduct(input: ProductInput) {
  const parsed = parseCreateInput(input);
  const now = toIsoNow();
  const listRef = ref(database, PRODUCTS_PATH);
  const newRef = push(listRef);
  const id = String(newRef.key || "");

  const payload: ProductRecord = {
    id,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };

  await set(newRef, payload);
  return payload;
}

export async function updateProduct(id: string, input: ProductInput) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const updatedFields = parseUpdateInput(input);
  const payload = {
    ...updatedFields,
    updatedAt: toIsoNow(),
  };

  const itemRef = ref(database, `${PRODUCTS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function updateProductPrices(id: string, input: PricesInput) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const payload: Partial<ProductRecord> = {};
  if (input.priceSell !== undefined) {
    payload.priceSell = asNonNegativeNumber(input.priceSell, "priceSell");
  }
  if (input.priceCost !== undefined) {
    payload.priceCost = asNonNegativeNumber(input.priceCost, "priceCost");
  }
  if (input.priceWholesale !== undefined) {
    payload.priceWholesale = asNonNegativeNumber(input.priceWholesale, "priceWholesale");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("VALIDATION:At least one price field is required");
  }

  payload.updatedAt = toIsoNow();
  const itemRef = ref(database, `${PRODUCTS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function updateProductStock(id: string, input: StockInput) {
  const existing = await getById(id);
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
    ? asNonNegativeNumber(input.stock, "stock")
    : existing.stock + Number(input.delta);

  if (!Number.isFinite(nextStock) || nextStock < 0) {
    throw new Error("VALIDATION:Resulting stock must be greater than or equal to 0");
  }

  const payload = {
    stock: nextStock,
    updatedAt: toIsoNow(),
  };

  const itemRef = ref(database, `${PRODUCTS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function setProductPublishState(id: string, isPublished: unknown) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const parsed = asBoolean(isPublished, "isPublished");
  const payload = { isPublished: parsed, updatedAt: toIsoNow() };

  const itemRef = ref(database, `${PRODUCTS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function deleteProduct(id: string) {
  const existing = await getById(id);
  if (!existing) {
    return false;
  }

  const itemRef = ref(database, `${PRODUCTS_PATH}/${id}`);
  await remove(itemRef);
  return true;
}
