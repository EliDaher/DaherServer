import { get, push, ref, remove, set, update } from "firebase/database";
import {
  asBoolean,
  asLocalizedRequired,
  asOptionalDateIso,
  asRequiredString,
  ensureDateRange,
  toBooleanQuery,
  toIsoNow,
  type LocalizedText,
} from "./storeValidation.service";
const { database } = require("../../firebaseConfig.js");

const OFFERS_PATH = "store/offers";

export type OfferRecord = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  productId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
};

export type OfferFilters = {
  isActive?: boolean;
  productId?: string;
  categoryId?: string;
  validNow?: boolean;
  search?: string;
};

type OfferInput = Partial<{
  title: unknown;
  description: unknown;
  imageUrl: unknown;
  startsAt: unknown;
  endsAt: unknown;
  isActive: unknown;
  productId: unknown;
  categoryId: unknown;
}>;

function normalizeOffer(raw: any): OfferRecord {
  return {
    id: String(raw?.id || ""),
    title: asLocalizedRequired(raw?.title || { ar: "", en: "" }, "title"),
    description: asLocalizedRequired(
      raw?.description || { ar: "", en: "" },
      "description",
    ),
    imageUrl: String(raw?.imageUrl || ""),
    startsAt: String(raw?.startsAt || ""),
    endsAt: String(raw?.endsAt || ""),
    isActive: Boolean(raw?.isActive),
    productId: String(raw?.productId || ""),
    categoryId: String(raw?.categoryId || ""),
    createdAt: String(raw?.createdAt || ""),
    updatedAt: String(raw?.updatedAt || ""),
  };
}

function parseCreateInput(input: OfferInput) {
  const startsAt = asOptionalDateIso(input.startsAt, "startsAt");
  const endsAt = asOptionalDateIso(input.endsAt, "endsAt");
  ensureDateRange(startsAt, endsAt);

  return {
    title: asLocalizedRequired(input.title, "title"),
    description: asLocalizedRequired(input.description, "description"),
    imageUrl: asRequiredString(input.imageUrl ?? "", "imageUrl", {
      allowEmpty: true,
    }),
    startsAt,
    endsAt,
    isActive: asBoolean(input.isActive, "isActive"),
    productId: asRequiredString(input.productId ?? "", "productId", {
      allowEmpty: true,
    }),
    categoryId: asRequiredString(input.categoryId ?? "", "categoryId", {
      allowEmpty: true,
    }),
  };
}

function parseUpdateInput(input: OfferInput) {
  const payload: Partial<Omit<OfferRecord, "id" | "createdAt" | "updatedAt">> = {};

  if (input.title !== undefined) {
    payload.title = asLocalizedRequired(input.title, "title");
  }
  if (input.description !== undefined) {
    payload.description = asLocalizedRequired(input.description, "description");
  }
  if (input.imageUrl !== undefined) {
    payload.imageUrl = asRequiredString(input.imageUrl, "imageUrl", {
      allowEmpty: true,
    });
  }
  if (input.startsAt !== undefined) {
    payload.startsAt = asOptionalDateIso(input.startsAt, "startsAt");
  }
  if (input.endsAt !== undefined) {
    payload.endsAt = asOptionalDateIso(input.endsAt, "endsAt");
  }
  if (input.isActive !== undefined) {
    payload.isActive = asBoolean(input.isActive, "isActive");
  }
  if (input.productId !== undefined) {
    payload.productId = asRequiredString(input.productId, "productId", {
      allowEmpty: true,
    });
  }
  if (input.categoryId !== undefined) {
    payload.categoryId = asRequiredString(input.categoryId, "categoryId", {
      allowEmpty: true,
    });
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("VALIDATION:No valid fields were provided");
  }

  ensureDateRange(payload.startsAt || "", payload.endsAt || "");
  return payload;
}

export function parseOfferFilters(query: Record<string, unknown>): OfferFilters {
  return {
    isActive: toBooleanQuery(query.isActive, "isActive"),
    validNow: toBooleanQuery(query.validNow, "validNow"),
    productId: typeof query.productId === "string" ? query.productId : undefined,
    categoryId: typeof query.categoryId === "string" ? query.categoryId : undefined,
    search: typeof query.search === "string" ? query.search : undefined,
  };
}

async function getById(id: string) {
  const itemRef = ref(database, `${OFFERS_PATH}/${id}`);
  const snapshot = await get(itemRef);
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeOffer(snapshot.val());
}

function isOfferValidNow(record: OfferRecord) {
  const now = Date.now();
  if (record.startsAt && new Date(record.startsAt).getTime() > now) {
    return false;
  }
  if (record.endsAt && new Date(record.endsAt).getTime() < now) {
    return false;
  }
  return true;
}

export async function listOffers(filters: OfferFilters = {}) {
  const rootRef = ref(database, OFFERS_PATH);
  const snapshot = await get(rootRef);
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  let records = Object.keys(data).map((id) =>
    normalizeOffer({ id, ...data[id] }),
  );

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
}

export async function getOfferById(id: string) {
  return getById(id);
}

export async function createOffer(input: OfferInput) {
  const parsed = parseCreateInput(input);
  const now = toIsoNow();
  const listRef = ref(database, OFFERS_PATH);
  const newRef = push(listRef);
  const id = String(newRef.key || "");

  const payload: OfferRecord = {
    id,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };

  await set(newRef, payload);
  return payload;
}

export async function updateOffer(id: string, input: OfferInput) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const updatedFields = parseUpdateInput(input);
  const payload = { ...updatedFields, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${OFFERS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function setOfferActiveState(id: string, isActive: unknown) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const parsed = asBoolean(isActive, "isActive");
  const payload = { isActive: parsed, updatedAt: toIsoNow() };
  const itemRef = ref(database, `${OFFERS_PATH}/${id}`);
  await update(itemRef, payload);

  return {
    ...existing,
    ...payload,
  };
}

export async function deleteOffer(id: string) {
  const existing = await getById(id);
  if (!existing) {
    return false;
  }

  const itemRef = ref(database, `${OFFERS_PATH}/${id}`);
  await remove(itemRef);
  return true;
}
