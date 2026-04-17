import { Request, Response } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  parseProductFilters,
  setProductPublishState,
  updateProduct,
  updateProductPrices,
  updateProductStock,
} from "../services/products.service";

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

export const getProducts = async (req: Request, res: Response) => {
  try {
    const filters = parseProductFilters(req.query as Record<string, unknown>);
    const records = await listProducts(filters);
    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: records,
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

export const getProduct = async (req: Request, res: Response) => {
  try {
    const item = await getProductById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
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

export const createProductHandler = async (req: Request, res: Response) => {
  try {
    const created = await createProduct(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Product created successfully",
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

export const updateProductHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateProduct(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
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

export const updateProductStockHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateProductStock(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
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

export const updateProductPricesHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const updated = await updateProductPrices(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product prices updated successfully",
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

export const updateProductPublishHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const updated = await setProductPublishState(
      req.params.id,
      req.body?.isPublished,
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product publish state updated successfully",
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

export const deleteProductHandler = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
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
