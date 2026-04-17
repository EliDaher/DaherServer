import { Request, Response } from "express";
import {
  createBanner,
  deleteBanner,
  getBannerById,
  listBanners,
  parseBannerFilters,
  setBannerActiveState,
  updateBanner,
} from "../services/banners.service";

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

export const getBanners = async (req: Request, res: Response) => {
  try {
    const filters = parseBannerFilters(req.query as Record<string, unknown>);
    const data = await listBanners(filters);
    return res.status(200).json({
      success: true,
      message: "Banners fetched successfully",
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

export const getBanner = async (req: Request, res: Response) => {
  try {
    const item = await getBannerById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner fetched successfully",
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

export const createBannerHandler = async (req: Request, res: Response) => {
  try {
    const created = await createBanner(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
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

export const updateBannerHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateBanner(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
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

export const updateBannerActiveHandler = async (req: Request, res: Response) => {
  try {
    const updated = await setBannerActiveState(req.params.id, req.body?.isActive);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner active state updated successfully",
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

export const deleteBannerHandler = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteBanner(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
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
