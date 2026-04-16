import { get, push, ref, remove, set, update } from "firebase/database";
const { database } = require("../../firebaseConfig.js");

type ProductRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  stock: number;
  priceSell: number;
  priceCost: number;
  priceWholesale: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductFilters = {
  search?: string;
  category?: string;
  inStock?: boolean;
};

type ProductInput = {
  name?: unknown;
  category?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  stock?: unknown;
  priceSell?: unknown;
  priceCost?: unknown;
  priceWholesale?: unknown;
};

type ProductUpdateInput = Partial<ProductInput>;

type StockUpdateInput = {
  stock?: unknown;
  delta?: unknown;
};

type PricesUpdateInput = {
  priceSell?: unknown;
  priceCost?: unknown;
  priceWholesale?: unknown;
};

function throwValidation(message: string): never {
  throw new Error(`VALIDATION:${message}`);
}

function requireString(
  value: unknown,
  field: string,
  options?: { allowEmpty?: boolean },
) {
  if (typeof value !== "string") {
    throwValidation(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!options?.allowEmpty && !trimmed) {
    throwValidation(`${field} is required`);
  }

  return trimmed;
}

function requireNumber(value: unknown, field: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throwValidation(`${field} must be a valid number`);
  }
  if (num < 0) {
    throwValidation(`${field} must be greater than or equal to 0`);
  }
  return num;
}

function normalizeProductInput(input: ProductInput): Omit<
  ProductRecord,
  "id" | "createdAt" | "updatedAt"
> {
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

function normalizeProductUpdateInput(input: ProductUpdateInput) {
  const payload: Partial<Omit<ProductRecord, "id" | "createdAt" | "updatedAt">> = {};

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

function normalizeProduct(product: any): ProductRecord {
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

async function getProductRecordById(id: string) {
  const productRef = ref(database, `products/${id}`);
  const snapshot = await get(productRef);
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeProduct(snapshot.val());
}

export async function listProducts(filters: ProductFilters = {}) {
  const productsRef = ref(database, "products");
  const snapshot = await get(productsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  let products = Object.keys(data).map((key) =>
    normalizeProduct({ id: key, ...data[key] }),
  );

  if (filters.search) {
    const query = filters.search.trim().toLowerCase();
    products = products.filter((item) => {
      const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  if (filters.category) {
    const category = filters.category.trim().toLowerCase();
    products = products.filter(
      (item) => item.category.trim().toLowerCase() === category,
    );
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
  return getProductRecordById(id);
}

export async function createProduct(input: ProductInput) {
  const normalized = normalizeProductInput(input);
  const now = new Date().toISOString();

  const productsRef = ref(database, "products");
  const newProductRef = push(productsRef);
  const id = String(newProductRef.key || "");

  const payload: ProductRecord = {
    id,
    ...normalized,
    createdAt: now,
    updatedAt: now,
  };

  await set(newProductRef, payload);

  return payload;
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const existing = await getProductRecordById(id);
  if (!existing) {
    return null;
  }

  const updatedFields = normalizeProductUpdateInput(input);
  const updatedAt = new Date().toISOString();
  const productRef = ref(database, `products/${id}`);

  await update(productRef, {
    ...updatedFields,
    updatedAt,
  });

  return {
    ...existing,
    ...updatedFields,
    updatedAt,
  };
}

export async function updateProductStock(id: string, input: StockUpdateInput) {
  const existing = await getProductRecordById(id);
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
  const productRef = ref(database, `products/${id}`);
  await update(productRef, {
    stock: nextStock,
    updatedAt,
  });

  return {
    ...existing,
    stock: nextStock,
    updatedAt,
  };
}

export async function updateProductPrices(id: string, input: PricesUpdateInput) {
  const existing = await getProductRecordById(id);
  if (!existing) {
    return null;
  }

  const payload: Partial<ProductRecord> = {};

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
  const productRef = ref(database, `products/${id}`);
  await update(productRef, {
    ...payload,
    updatedAt,
  });

  return {
    ...existing,
    ...payload,
    updatedAt,
  };
}

export async function deleteProduct(id: string) {
  const existing = await getProductRecordById(id);
  if (!existing) {
    return false;
  }

  const productRef = ref(database, `products/${id}`);
  await remove(productRef);
  return true;
}
