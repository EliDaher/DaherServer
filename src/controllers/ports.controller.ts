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

export const getportsOperations = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, executorName } = req.query as {
      fromDate?: string;
      toDate?: string;
      executorName?: string;
    };

    const operations = await getportsOperationsService({
      fromDate,
      toDate,
      executorName,
    });

    return res.status(200).json({
      success: true,
      count: operations.length,
      operations,
    });
  } catch (error: any) {
    console.error("getportsOperations controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ports operations",
    });
  }
};
