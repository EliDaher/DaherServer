import { Request, Response } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  ProductFilters,
  updateProduct,
  updateProductPrices,
  updateProductStock,
} from "../services/products.service";

function getErrorResponse(error: unknown) {
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

function parseInStockQuery(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  throw new Error("VALIDATION:inStock must be true or false");
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const filters: ProductFilters = {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      category:
        typeof req.query.category === "string" ? req.query.category : undefined,
      inStock: parseInStockQuery(req.query.inStock),
    };

    const products = await listProducts(filters);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
    });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
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
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
    });
  }
};

export const updateProductHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateProduct(id, req.body || {});

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (error) {
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
    });
  }
};

export const updateProductStockHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateProductStock(id, req.body || {});

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
      data: updated,
    });
  } catch (error) {
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
    });
  }
};

export const updateProductPricesHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const updated = await updateProductPrices(id, req.body || {});

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product prices updated successfully",
      data: updated,
    });
  } catch (error) {
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
    });
  }
};

export const deleteProductHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProduct(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: { id },
    });
  } catch (error) {
    const parsed = getErrorResponse(error);
    return res.status(parsed.status).json({
      success: false,
      message: parsed.message,
    });
  }
};
