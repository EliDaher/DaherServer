import { get, push, ref, remove, set, update } from "firebase/database";
import {
  asBoolean,
  asNonNegativeInteger,
  asRequiredString,
  toBooleanQuery,
  toIsoNow,
} from "./storeValidation.service";
const { database } = require("../../firebaseConfig.js");

const BRANDS_PATH = "store/brands";

export type BrandRecord = {
  id: string;
  name: string;
  logoUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandFilters = {
  isActive?: boolean;
  search?: string;
};

type BrandInput = Partial<{
  name: unknown;
  logoUrl: unknown;
  sortOrder: unknown;
  isActive: unknown;
}>;

function normalizeBrand(raw: any): BrandRecord {
  return {
    id: String(raw?.id || ""),
    name: String(raw?.name || ""),
    logoUrl: String(raw?.logoUrl || ""),
    sortOrder: Number(raw?.sortOrder || 0),
    isActive: Boolean(raw?.isActive),
    createdAt: String(raw?.createdAt || ""),
    updatedAt: String(raw?.updatedAt || ""),
  };
}

function parseCreateInput(input: BrandInput) {
  return {
    name: asRequiredString(input.name, "name"),
    logoUrl: asRequiredString(input.logoUrl ?? "", "logoUrl", {
      allowEmpty: true,
    }),
    sortOrder: asNonNegativeInteger(input.sortOrder, "sortOrder"),
    isActive: asBoolean(input.isActive, "isActive"),
  };
}

function parseUpdateInput(input: BrandInput) {
  const payload: Partial<Omit<BrandRecord, "id" | "createdAt" | "updatedAt">> = {};

  if (input.name !== undefined) {
    payload.name = asRequiredString(input.name, "name");
  }
  if (input.logoUrl !== undefined) {
    payload.logoUrl = asRequiredString(input.logoUrl, "logoUrl", {
      allowEmpty: true,
    });
  }
  if (input.sortOrder !== undefined) {
    payload.sortOrder = asNonNegativeInteger(input.sortOrder, "sortOrder");
  }
  if (input.isActive !== undefined) {
    payload.isActive = asBoolean(input.isActive, "isActive");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("VALIDATION:No valid fields were provided");
  }

  return payload;
}

export function parseBrandFilters(query: Record<string, unknown>): BrandFilters {
  return {
    isActive: toBooleanQuery(query.isActive, "isActive"),
    search: typeof query.search === "string" ? query.search : undefined,
  };
}

async function getById(id: string) {
  const itemRef = ref(database, `${BRANDS_PATH}/${id}`);
  const snapshot = await get(itemRef);
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeBrand(snapshot.val());
}

export async function listBrands(filters: BrandFilters = {}) {
  const listRef = ref(database, BRANDS_PATH);
  const snapshot = await get(listRef);
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  let records = Object.keys(data).map((id) =>
    normalizeBrand({ id, ...data[id] }),
  );

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
    return (
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
  });

  return records;
}

export async function getBrandById(id: string) {
  return getById(id);
}

export async function createBrand(input: BrandInput) {
  const parsed = parseCreateInput(input);
  const now = toIsoNow();
  const listRef = ref(database, BRANDS_PATH);
  const newRef = push(listRef);
  const id = String(newRef.key || "");

  const payload: BrandRecord = {
    id,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };

  await set(newRef, payload);
  return payload;
}

export async function updateBrand(id: string, input: BrandInput) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const updatedFields = parseUpdateInput(input);
  const payload = { ...updatedFields, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${BRANDS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function setBrandActiveState(id: string, isActive: unknown) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const parsed = asBoolean(isActive, "isActive");
  const payload = { isActive: parsed, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${BRANDS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function deleteBrand(id: string) {
  const existing = await getById(id);
  if (!existing) {
    return false;
  }

  const itemRef = ref(database, `${BRANDS_PATH}/${id}`);
  await remove(itemRef);
  return true;
}
