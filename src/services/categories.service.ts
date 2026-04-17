import { get, push, ref, remove, set, update } from "firebase/database";
import {
  asBoolean,
  asLocalizedRequired,
  asNonNegativeInteger,
  toBooleanQuery,
  toIsoNow,
  type LocalizedText,
} from "./storeValidation.service";
const { database } = require("../../firebaseConfig.js");

const CATEGORIES_PATH = "store/categories";

export type CategoryRecord = {
  id: string;
  label: LocalizedText;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryFilters = {
  isActive?: boolean;
  search?: string;
};

type CategoryInput = Partial<{
  label: unknown;
  sortOrder: unknown;
  isActive: unknown;
}>;

function normalizeCategory(raw: any): CategoryRecord {
  return {
    id: String(raw?.id || ""),
    label: asLocalizedRequired(raw?.label || { ar: "", en: "" }, "label"),
    sortOrder: Number(raw?.sortOrder || 0),
    isActive: Boolean(raw?.isActive),
    createdAt: String(raw?.createdAt || ""),
    updatedAt: String(raw?.updatedAt || ""),
  };
}

function parseCreateInput(input: CategoryInput) {
  return {
    label: asLocalizedRequired(input.label, "label"),
    sortOrder: asNonNegativeInteger(input.sortOrder, "sortOrder"),
    isActive: asBoolean(input.isActive, "isActive"),
  };
}

function parseUpdateInput(input: CategoryInput) {
  const payload: Partial<Omit<CategoryRecord, "id" | "createdAt" | "updatedAt">> = {};

  if (input.label !== undefined) {
    payload.label = asLocalizedRequired(input.label, "label");
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

export function parseCategoryFilters(query: Record<string, unknown>): CategoryFilters {
  return {
    isActive: toBooleanQuery(query.isActive, "isActive"),
    search: typeof query.search === "string" ? query.search : undefined,
  };
}

async function getById(id: string) {
  const itemRef = ref(database, `${CATEGORIES_PATH}/${id}`);
  const snapshot = await get(itemRef);
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeCategory(snapshot.val());
}

export async function listCategories(filters: CategoryFilters = {}) {
  const listRef = ref(database, CATEGORIES_PATH);
  const snapshot = await get(listRef);
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  let records = Object.keys(data).map((id) =>
    normalizeCategory({ id, ...data[id] }),
  );

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
    return (
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
  });

  return records;
}

export async function getCategoryById(id: string) {
  return getById(id);
}

export async function createCategory(input: CategoryInput) {
  const parsed = parseCreateInput(input);
  const now = toIsoNow();
  const listRef = ref(database, CATEGORIES_PATH);
  const newRef = push(listRef);
  const id = String(newRef.key || "");

  const payload: CategoryRecord = {
    id,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };

  await set(newRef, payload);
  return payload;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const updatedFields = parseUpdateInput(input);
  const payload = { ...updatedFields, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${CATEGORIES_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function setCategoryActiveState(id: string, isActive: unknown) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const parsed = asBoolean(isActive, "isActive");
  const payload = { isActive: parsed, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${CATEGORIES_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function deleteCategory(id: string) {
  const existing = await getById(id);
  if (!existing) {
    return false;
  }

  const itemRef = ref(database, `${CATEGORIES_PATH}/${id}`);
  await remove(itemRef);
  return true;
}
