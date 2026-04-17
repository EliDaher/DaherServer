import { get, push, ref, remove, set, update } from "firebase/database";
import {
  asBoolean,
  asLocalizedOptional,
  asLocalizedRequired,
  asNonNegativeInteger,
  asRequiredString,
  toBooleanQuery,
  toIsoNow,
  type LocalizedText,
} from "./storeValidation.service";
const { database } = require("../../firebaseConfig.js");

const BANNERS_PATH = "store/banners";

export type BannerRecord = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BannerFilters = {
  isActive?: boolean;
  search?: string;
};

type BannerInput = Partial<{
  title: unknown;
  subtitle: unknown;
  imageUrl: unknown;
  linkUrl: unknown;
  sortOrder: unknown;
  isActive: unknown;
}>;

function normalizeBanner(raw: any): BannerRecord {
  return {
    id: String(raw?.id || ""),
    title: asLocalizedRequired(raw?.title || { ar: "", en: "" }, "title"),
    subtitle: asLocalizedOptional(raw?.subtitle || { ar: "", en: "" }, "subtitle"),
    imageUrl: String(raw?.imageUrl || ""),
    linkUrl: String(raw?.linkUrl || ""),
    sortOrder: Number(raw?.sortOrder || 0),
    isActive: Boolean(raw?.isActive),
    createdAt: String(raw?.createdAt || ""),
    updatedAt: String(raw?.updatedAt || ""),
  };
}

function parseCreateInput(input: BannerInput) {
  return {
    title: asLocalizedRequired(input.title, "title"),
    subtitle: asLocalizedOptional(input.subtitle, "subtitle"),
    imageUrl: asRequiredString(input.imageUrl ?? "", "imageUrl", {
      allowEmpty: true,
    }),
    linkUrl: asRequiredString(input.linkUrl ?? "", "linkUrl", {
      allowEmpty: true,
    }),
    sortOrder: asNonNegativeInteger(input.sortOrder, "sortOrder"),
    isActive: asBoolean(input.isActive, "isActive"),
  };
}

function parseUpdateInput(input: BannerInput) {
  const payload: Partial<Omit<BannerRecord, "id" | "createdAt" | "updatedAt">> = {};

  if (input.title !== undefined) {
    payload.title = asLocalizedRequired(input.title, "title");
  }
  if (input.subtitle !== undefined) {
    payload.subtitle = asLocalizedOptional(input.subtitle, "subtitle");
  }
  if (input.imageUrl !== undefined) {
    payload.imageUrl = asRequiredString(input.imageUrl, "imageUrl", {
      allowEmpty: true,
    });
  }
  if (input.linkUrl !== undefined) {
    payload.linkUrl = asRequiredString(input.linkUrl, "linkUrl", {
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

export function parseBannerFilters(query: Record<string, unknown>): BannerFilters {
  return {
    isActive: toBooleanQuery(query.isActive, "isActive"),
    search: typeof query.search === "string" ? query.search : undefined,
  };
}

async function getById(id: string) {
  const itemRef = ref(database, `${BANNERS_PATH}/${id}`);
  const snapshot = await get(itemRef);
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeBanner(snapshot.val());
}

export async function listBanners(filters: BannerFilters = {}) {
  const listRef = ref(database, BANNERS_PATH);
  const snapshot = await get(listRef);
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  let records = Object.keys(data).map((id) =>
    normalizeBanner({ id, ...data[id] }),
  );

  if (filters.isActive !== undefined) {
    records = records.filter((item) => item.isActive === filters.isActive);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase().trim();
    records = records.filter((item) => {
      const text = `${item.title.ar} ${item.title.en} ${item.subtitle.ar} ${item.subtitle.en}`.toLowerCase();
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

export async function getBannerById(id: string) {
  return getById(id);
}

export async function createBanner(input: BannerInput) {
  const parsed = parseCreateInput(input);
  const now = toIsoNow();
  const listRef = ref(database, BANNERS_PATH);
  const newRef = push(listRef);
  const id = String(newRef.key || "");

  const payload: BannerRecord = {
    id,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };

  await set(newRef, payload);
  return payload;
}

export async function updateBanner(id: string, input: BannerInput) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const updatedFields = parseUpdateInput(input);
  const payload = { ...updatedFields, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${BANNERS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function setBannerActiveState(id: string, isActive: unknown) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const parsed = asBoolean(isActive, "isActive");
  const payload = { isActive: parsed, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${BANNERS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function deleteBanner(id: string) {
  const existing = await getById(id);
  if (!existing) {
    return false;
  }

  const itemRef = ref(database, `${BANNERS_PATH}/${id}`);
  await remove(itemRef);
  return true;
}
