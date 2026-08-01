import { NextFunction, Request, Response, Router } from "express";
import {
  disableUsers,
  getActiveConnections,
  testConnection,
} from "../controllers/mikrotik.controller";

const router = Router();

const requireRelayKey = (req: Request, res: Response, next: NextFunction) => {
  const expectedKey = process.env.MIKROTIK_RELAY_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      error: "MIKROTIK_RELAY_KEY is not configured.",
    });
  }

  if (req.header("x-mikrotik-relay-key") !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: "Invalid MikroTik relay key.",
    });
  }

  return next();
};

router.use(requireRelayKey);

router.get("/test", testConnection);
router.get("/active", getActiveConnections);
router.post("/disable", disableUsers);

export default router;
