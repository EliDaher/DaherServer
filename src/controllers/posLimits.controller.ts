import { Request, Response } from "express";

type PosLimitRecord = {
  posKey: string;
  minBalance: number;
  updatedAt: string;
  updatedBy: string;
};

const { ref, get, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

const POS_LIMITS_NODE = "posBalanceLimits";
const INVALID_FIREBASE_KEY_CHARS = /[.#$/\[\]]/g;

function sanitizePosKey(value: string) {
  return value.trim().replace(INVALID_FIREBASE_KEY_CHARS, "_");
}

function toNonNegativeNumber(value: unknown): number | null {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    return null;
  }

  return normalized;
}

function isValidUpdatedBy(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const getPosLimits = async (_req: Request, res: Response) => {
  try {
    const limitsRef = ref(database, POS_LIMITS_NODE);
    const snapshot = await get(limitsRef);

    if (!snapshot.exists()) {
      return res.status(200).json({ limits: [] });
    }

    const rawLimits = snapshot.val() as Record<string, Partial<PosLimitRecord>>;

    const limits: PosLimitRecord[] = Object.entries(rawLimits).map(
      ([posKey, value]) => ({
        posKey,
        minBalance: toNonNegativeNumber(value?.minBalance) ?? 0,
        updatedAt:
          typeof value?.updatedAt === "string" && value.updatedAt
            ? value.updatedAt
            : new Date(0).toISOString(),
        updatedBy:
          typeof value?.updatedBy === "string" && value.updatedBy
            ? value.updatedBy
            : "unknown",
      }),
    );

    limits.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return res.status(200).json({ limits });
  } catch (error) {
    console.error("Error fetching POS limits:", error);
    return res.status(500).json({ error: "Failed to fetch POS limits" });
  }
};

export const upsertPosLimit = async (req: Request, res: Response) => {
  try {
    const normalizedParam = String(req.params.posKey || "");
    const posKey = sanitizePosKey(normalizedParam);
    const minBalance = toNonNegativeNumber(req.body?.minBalance);
    const updatedBy = req.body?.updatedBy;

    if (!posKey) {
      return res.status(400).json({ message: "Invalid posKey" });
    }

    if (minBalance === null) {
      return res.status(400).json({
        message: "Invalid minBalance. Expected a non-negative number.",
      });
    }

    if (!isValidUpdatedBy(updatedBy)) {
      return res.status(400).json({
        message: "Invalid updatedBy. Expected a non-empty string.",
      });
    }

    const record: PosLimitRecord = {
      posKey,
      minBalance,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.trim(),
    };

    const targetRef = ref(database, `${POS_LIMITS_NODE}/${posKey}`);
    await set(targetRef, record);

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error upserting POS limit:", error);
    return res.status(500).json({ error: "Failed to upsert POS limit" });
  }
};
