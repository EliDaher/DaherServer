import { Request, Response } from "express";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  parseCategoryFilters,
  setCategoryActiveState,
  updateCategory,
} from "../services/categories.service";

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

export const getCategories = async (req: Request, res: Response) => {
  try {
    const filters = parseCategoryFilters(req.query as Record<string, unknown>);
    const data = await listCategories(filters);
    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
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

export const getCategory = async (req: Request, res: Response) => {
  try {
    const item = await getCategoryById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
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

export const createCategoryHandler = async (req: Request, res: Response) => {
  try {
    const created = await createCategory(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
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

export const updateCategoryHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateCategory(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
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

export const updateCategoryActiveHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const updated = await setCategoryActiveState(req.params.id, req.body?.isActive);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category active state updated successfully",
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

export const deleteCategoryHandler = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
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
