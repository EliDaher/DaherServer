import { Request, Response } from "express";
import {
  disablePppUsers,
  getActivePppConnections,
  getMikrotikError,
  testMikrotikConnection,
} from "../services/mikrotik.service";

const sendMikrotikError = (res: Response, error: unknown) => {
  const details = getMikrotikError(error);
  return res.status(details.statusCode).json({
    success: false,
    error: details.message,
  });
};

export const testConnection = async (_req: Request, res: Response) => {
  try {
    const data = await testMikrotikConnection();
    return res.json({ success: true, data });
  } catch (error) {
    return sendMikrotikError(res, error);
  }
};

export const getActiveConnections = async (_req: Request, res: Response) => {
  try {
    const data = await getActivePppConnections();
    return res.json({ success: true, data });
  } catch (error) {
    return sendMikrotikError(res, error);
  }
};

export const disableUsers = async (req: Request, res: Response) => {
  try {
    const usernames = Array.isArray(req.body?.usernames)
      ? req.body.usernames
          .map((username: unknown) => String(username).trim())
          .filter(Boolean)
      : [];

    if (usernames.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing usernames list.",
      });
    }

    const results = await disablePppUsers(usernames);
    const successCount = results.filter((item) => item.ok).length;

    return res.json({
      success: results.every((item) => item.ok),
      requested_count: results.length,
      success_count: successCount,
      failed_count: results.length - successCount,
      results,
    });
  } catch (error) {
    return sendMikrotikError(res, error);
  }
};
