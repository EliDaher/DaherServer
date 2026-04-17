import { Router } from "express";
import {
  createBrandHandler,
  deleteBrandHandler,
  getBrand,
  getBrands,
  updateBrandActiveHandler,
  updateBrandHandler,
} from "../controllers/brands.controller";

const router = Router();

router.get("/", getBrands);
router.get("/:id", getBrand);
router.post("/", createBrandHandler);
router.put("/:id", updateBrandHandler);
router.patch("/:id/active", updateBrandActiveHandler);
router.delete("/:id", deleteBrandHandler);

export default router;
