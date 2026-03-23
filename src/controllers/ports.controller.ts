import { Request, Response } from "express";
import {
  AddPortOperationParams,
  addPortOperation,
  getportsOperations as getportsOperationsService,
} from "../services/ports.service";

export const addPortOprationInternal = async ({
  executorName,
  operationType,
  note,
}: AddPortOperationParams) => {
  return addPortOperation({ executorName, operationType, note });
};

const OPERATIONS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let operationsCache:
  | {
      key: string;
      data: {
        success: boolean;
        count: number;
        operations: any[];
      };
      lastFetch: number;
    }
  | null = null;


export const getportsOperations = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, executorName } = req.query as {
      fromDate?: string;
      toDate?: string;
      executorName?: string;
    };

    const cacheKey = `${fromDate || ""}|${toDate || ""}|${executorName || ""}`;

    if (
      operationsCache &&
      operationsCache.key === cacheKey &&
      Date.now() - operationsCache.lastFetch < OPERATIONS_CACHE_TTL_MS
    ) {
      return res.status(200).json(operationsCache.data);
    }

    const operations = await getportsOperationsService({
      fromDate,
      toDate,
      executorName,
    });

    const responseData = {
      success: true,
      count: operations.length,
      operations,
    };

    operationsCache = {
      key: cacheKey,
      data: responseData,
      lastFetch: Date.now(),
    };

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("getportsOperations controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ports operations",
    });
  }
};
