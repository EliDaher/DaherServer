import { Request, Response } from "express";
import {
  createBrand,
  deleteBrand,
  getBrandById,
  listBrands,
  parseBrandFilters,
  setBrandActiveState,
  updateBrand,
} from "../services/brands.service";

function errorToResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message.startsWith("VALIDATION:")) {
      return {
        status: 400,
        message: error.message.replace("VALIDATION:", "").trim(),
      };
    }
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "Unexpected server error" };
}

export const getBrands = async (req: Request, res: Response) => {
  try {
    const filters = parseBrandFilters(req.query as Record<string, unknown>);
    const data = await listBrands(filters);
    return res.status(200).json({
      success: true,
      message: "Brands fetched successfully",
      data,
    });
  } catch (error) {
    const parsed = errorToResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
      data: null,
    });
  }
};

export const getBrand = async (req: Request, res: Response) => {
  try {
    const item = await getBrandById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand fetched successfully",
      data: item,
    });
  } catch (error) {
    const parsed = errorToResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
      data: null,
    });
  }
};

export const createBrandHandler = async (req: Request, res: Response) => {
  try {
    const created = await createBrand(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: created,
    });
  } catch (error) {
    const parsed = errorToResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
      data: null,
    });
  }
};

export const updateBrandHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateBrand(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: updated,
    });
  } catch (error) {
    const parsed = errorToResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
      data: null,
    });
  }
};

export const updateBrandActiveHandler = async (req: Request, res: Response) => {
  try {
    const updated = await setBrandActiveState(req.params.id, req.body?.isActive);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand active state updated successfully",
      data: updated,
    });
  } catch (error) {
    const parsed = errorToResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
      data: null,
    });
  }
};

export const deleteBrandHandler = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteBrand(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
      data: { id: req.params.id },
    });
  } catch (error) {
    const parsed = errorToResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
      data: null,
    });
  }
};
