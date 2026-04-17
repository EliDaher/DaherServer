import { Router } from "express";
import {
  createBannerHandler,
  deleteBannerHandler,
  getBanner,
  getBanners,
  updateBannerActiveHandler,
  updateBannerHandler,
} from "../controllers/banners.controller";

const router = Router();

router.get("/", getBanners);
router.get("/:id", getBanner);
router.post("/", createBannerHandler);
router.put("/:id", updateBannerHandler);
router.patch("/:id/active", updateBannerActiveHandler);
router.delete("/:id", deleteBannerHandler);

export default router;
