import { Request, Response } from "express";
const {
  ref,
  set,
  push,
  get,
  child,
  remove
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const addPendingExchange = async (req: Request, res: Response) => {
  try {
    const { sypAmount, usdAmount, details, date } = req.body;
    if (!sypAmount || !usdAmount || !details || !date) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const newExchangeRef = push(ref(database, "exchange/pending"));
    const exchangeID = newExchangeRef.key;

    const formData = {
      id: exchangeID,
      sypAmount,
      usdAmount,
      details,
      date,
      timestamp: Date.now(),
    };

    await set(newExchangeRef, formData);
    res.status(200).json({ success: true, message: "Exchange added successfully" });
  } catch (error) {
    console.error("Error adding exchange:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPendingExchange = async (_req: Request, res: Response) => {
  try {
    const snapshot = await get(ref(database, "exchange/pending"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const pendingList = Object.entries(data).map(([id, value]: any) => ({
        id,
        ...value,
      }));
      res.status(200).json({ success: true, pendingList });
    } else {
      res.status(200).json({ success: true, pendingList: [] });
    }
  } catch (error) {
    console.error("Error getting pending exchanges:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
};

export const deletePendingExchange = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });

    await remove(ref(database, `exchange/pending/${id}`));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting pending exchange:", error);
    res.status(500).json({ error: "Failed to delete data" });
  }
};

export const addDoneExchange = async (req: Request, res: Response) => {
  try {
    const { sypAmount, usdAmount, details, date } = req.body;
    if (!sypAmount || !usdAmount || !details || !date) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const newExchangeRef = push(ref(database, "exchange/done"));
    const exchangeID = newExchangeRef.key;

    const formData = {
      id: exchangeID,
      sypAmount,
      usdAmount,
      details,
      date,
      timestamp: Date.now(),
    };

    await set(newExchangeRef, formData);
    res.status(200).json({ success: true, message: "Exchange added successfully" });
  } catch (error) {
    console.error("Error adding done exchange:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDoneExchange = async (_req: Request, res: Response) => {
  try {
    const snapshot = await get(ref(database, "exchange/done"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const doneList = Object.entries(data).map(([id, value]: any) => ({
        id,
        ...value,
      }));
      res.status(200).json({ success: true, doneList });
    } else {
      res.status(200).json({ success: true, doneList: [] });
    }
  } catch (error) {
    console.error("Error getting done exchanges:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
};

export const deleteDoneExchange = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });

    await remove(ref(database, `exchange/done/${id}`));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting done exchange:", error);
    res.status(500).json({ error: "Failed to delete data" });
  }
};