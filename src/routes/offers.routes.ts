import { Router } from "express";
import {
  createOfferHandler,
  deleteOfferHandler,
  getOffer,
  getOffers,
  updateOfferActiveHandler,
  updateOfferHandler,
} from "../controllers/offers.controller";

const router = Router();

router.get("/", getOffers);
router.get("/:id", getOffer);
router.post("/", createOfferHandler);
router.put("/:id", updateOfferHandler);
router.patch("/:id/active", updateOfferActiveHandler);
router.delete("/:id", deleteOfferHandler);

export default router;
