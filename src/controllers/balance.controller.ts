import { Request, Response } from "express";
const { ref, get, child } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const getTotalDayBalance = async (req: Request, res: Response) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const dbRef = ref(database);
    let result: { id: string; count: number; total: number }[] = [];

    const snapshot = await get(child(dbRef, `dailyTotal/${date}`));
    if (snapshot.exists()) {
      const data = snapshot.val();

      result = Object.keys(data).map((userId) => {
        const userOperations = data[userId];
        const totals = Object.values(userOperations);

        let userTotal = 0;
        let userCount = 0;

        totals.forEach((op: any) => {
          userTotal += Number(op.total) || 0;
          userCount += 1;
        });

        return {
          id: userId,
          count: userCount,
          total: userTotal
        };
      });

    } else {
      console.log(`No data available for date: ${date}`);
    }

    res.status(200).json({
      success: true,
      BalanceTable: result
    });

  } catch (error: any) {
    console.error("Error fetching daily total balance:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب البيانات",
      error: error.message
    });
  }
};
