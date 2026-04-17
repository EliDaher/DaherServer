import { Request, Response } from "express";
import {
  createOffer,
  deleteOffer,
  getOfferById,
  listOffers,
  parseOfferFilters,
  setOfferActiveState,
  updateOffer,
} from "../services/offers.service";

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

export const getOffers = async (req: Request, res: Response) => {
  try {
    const filters = parseOfferFilters(req.query as Record<string, unknown>);
    const data = await listOffers(filters);
    return res.status(200).json({
      success: true,
      message: "Offers fetched successfully",
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

export const getOffer = async (req: Request, res: Response) => {
  try {
    const item = await getOfferById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer fetched successfully",
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

export const createOfferHandler = async (req: Request, res: Response) => {
  try {
    const created = await createOffer(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
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

export const updateOfferHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateOffer(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
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

export const updateOfferActiveHandler = async (req: Request, res: Response) => {
  try {
    const updated = await setOfferActiveState(req.params.id, req.body?.isActive);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer active state updated successfully",
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

export const deleteOfferHandler = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteOffer(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
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
