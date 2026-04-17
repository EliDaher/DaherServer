import { Router } from "express";
import {
  createProductHandler,
  deleteProductHandler,
  getProduct,
  getProducts,
  updateProductHandler,
  updateProductPublishHandler,
  updateProductPricesHandler,
  updateProductStockHandler,
} from "../controllers/products.controller";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", createProductHandler);
router.put("/:id", updateProductHandler);
router.patch("/:id/stock", updateProductStockHandler);
router.patch("/:id/prices", updateProductPricesHandler);
router.patch("/:id/publish", updateProductPublishHandler);
router.delete("/:id", deleteProductHandler);

export default router;
