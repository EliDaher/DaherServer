"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asRequiredString = asRequiredString;
exports.asOptionalString = asOptionalString;
exports.asBoolean = asBoolean;
exports.asNonNegativeNumber = asNonNegativeNumber;
exports.asNonNegativeInteger = asNonNegativeInteger;
exports.asLocalizedRequired = asLocalizedRequired;
exports.asLocalizedOptional = asLocalizedOptional;
exports.asOptionalDateIso = asOptionalDateIso;
exports.ensureDateRange = ensureDateRange;
exports.toBooleanQuery = toBooleanQuery;
exports.toIsoNow = toIsoNow;
function raiseValidation(message) {
    throw new Error(`VALIDATION:${message}`);
}
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function asRequiredString(value, fieldName, options = {}) {
    if (typeof value !== "string") {
        raiseValidation(`${fieldName} must be a string`);
    }
    const normalized = value.trim();
    if (!options.allowEmpty && normalized.length === 0) {
        raiseValidation(`${fieldName} is required`);
    }
    return normalized;
}
function asOptionalString(value, fallback = "") {
    if (typeof value !== "string") {
        return fallback;
    }
    return value.trim();
}
function asBoolean(value, fieldName) {
    if (typeof value !== "boolean") {
        raiseValidation(`${fieldName} must be boolean`);
    }
    return value;
}
function asNonNegativeNumber(value, fieldName) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        raiseValidation(`${fieldName} must be a valid number`);
    }
    if (num < 0) {
        raiseValidation(`${fieldName} must be greater than or equal to 0`);
    }
    return num;
}
function asNonNegativeInteger(value, fieldName) {
    const num = asNonNegativeNumber(value, fieldName);
    if (!Number.isInteger(num)) {
        raiseValidation(`${fieldName} must be an integer`);
    }
    return num;
}
function asLocalizedRequired(value, fieldName) {
    if (!isObject(value)) {
        raiseValidation(`${fieldName} must be an object with ar and en`);
    }
    return {
        ar: asRequiredString(value.ar, `${fieldName}.ar`),
        en: asRequiredString(value.en, `${fieldName}.en`),
    };
}
function asLocalizedOptional(value, fieldName) {
    var _a, _b;
    if (!isObject(value)) {
        return { ar: "", en: "" };
    }
    return {
        ar: asRequiredString((_a = value.ar) !== null && _a !== void 0 ? _a : "", `${fieldName}.ar`, { allowEmpty: true }),
        en: asRequiredString((_b = value.en) !== null && _b !== void 0 ? _b : "", `${fieldName}.en`, { allowEmpty: true }),
    };
}
function asOptionalDateIso(value, fieldName) {
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
function ensureDateRange(startsAt, endsAt) {
    if (!startsAt || !endsAt) {
        return;
    }
    if (new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
        raiseValidation("startsAt must be less than or equal to endsAt");
    }
}
function toBooleanQuery(value, fieldName) {
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
function toIsoNow() {
    return new Date().toISOString();
}
