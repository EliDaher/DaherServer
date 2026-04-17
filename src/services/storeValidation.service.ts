export type LocalizedText = {
  ar: string;
  en: string;
};

type OptionalStringOptions = {
  allowEmpty?: boolean;
};

function raiseValidation(message: string): never {
  throw new Error(`VALIDATION:${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asRequiredString(
  value: unknown,
  fieldName: string,
  options: OptionalStringOptions = {},
) {
  if (typeof value !== "string") {
    raiseValidation(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!options.allowEmpty && normalized.length === 0) {
    raiseValidation(`${fieldName} is required`);
  }

  return normalized;
}

export function asOptionalString(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
}

export function asBoolean(value: unknown, fieldName: string) {
  if (typeof value !== "boolean") {
    raiseValidation(`${fieldName} must be boolean`);
  }
  return value;
}

export function asNonNegativeNumber(value: unknown, fieldName: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    raiseValidation(`${fieldName} must be a valid number`);
  }
  if (num < 0) {
    raiseValidation(`${fieldName} must be greater than or equal to 0`);
  }
  return num;
}

export function asNonNegativeInteger(value: unknown, fieldName: string) {
  const num = asNonNegativeNumber(value, fieldName);
  if (!Number.isInteger(num)) {
    raiseValidation(`${fieldName} must be an integer`);
  }
  return num;
}

export function asLocalizedRequired(value: unknown, fieldName: string): LocalizedText {
  if (!isObject(value)) {
    raiseValidation(`${fieldName} must be an object with ar and en`);
  }

  return {
    ar: asRequiredString(value.ar, `${fieldName}.ar`),
    en: asRequiredString(value.en, `${fieldName}.en`),
  };
}

export function asLocalizedOptional(value: unknown, fieldName: string): LocalizedText {
  if (!isObject(value)) {
    return { ar: "", en: "" };
  }

  return {
    ar: asRequiredString(value.ar ?? "", `${fieldName}.ar`, { allowEmpty: true }),
    en: asRequiredString(value.en ?? "", `${fieldName}.en`, { allowEmpty: true }),
  };
}

export function asOptionalDateIso(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    raiseValidation(`${fieldName} must be a valid ISO date string`);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    raiseValidation(`${fieldName} must be a valid ISO date string`);
  }

  return new Date(timestamp).toISOString();
}

export function ensureDateRange(startsAt: string, endsAt: string) {
  if (!startsAt || !endsAt) {
    return;
  }

  if (new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    raiseValidation("startsAt must be less than or equal to endsAt");
  }
}

export function toBooleanQuery(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  raiseValidation(`${fieldName} must be true or false`);
}

export function toIsoNow() {
  return new Date().toISOString();
}
