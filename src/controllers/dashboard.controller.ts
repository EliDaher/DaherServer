import { Request, Response } from "express";
import { getDashboardOverview } from "../services/dashboard.service";

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const data = await getDashboardOverview();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error generating dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate dashboard data",
      error: error?.message || "Unknown error",
    });
  }
};
