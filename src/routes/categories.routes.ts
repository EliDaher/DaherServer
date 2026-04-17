import { Router } from "express";
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategories,
  getCategory,
  updateCategoryActiveHandler,
  updateCategoryHandler,
} from "../controllers/categories.controller";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategory);
router.post("/", createCategoryHandler);
router.put("/:id", updateCategoryHandler);
router.patch("/:id/active", updateCategoryActiveHandler);
router.delete("/:id", deleteCategoryHandler);

export default router;
