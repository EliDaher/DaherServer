import { Request, Response } from "express";
const { ref, get, child } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

interface UserSummary {
  id: string;
  count: number;
  total: number;
}

export const getTotalDayBalance = async (req: Request, res: Response) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const dbRef = ref(database);
    let result: UserSummary[] = [];

    const snapshot = await get(child(dbRef, `dailyTotal/${date}`));
    if (snapshot.exists()) {
      const data = snapshot.val();

      result = Object.entries(data).map(([userId, operations]: [string, any]) => {
        const entries = Object.values(operations) as any[];

        let userTotal = 0;
        let userCount = 0;

        entries.forEach((op) => {
          userTotal += Number(op.amount) || 0;
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
export const getTotalBalance = async (req: Request, res: Response) => {
  try {
    // نص البحث في التاريخ: ممكن يكون سنة فقط "2025-06" أو سنة-شهر-يوم "2025-06-16"
    const dateSubstring = req.query.date ? String(req.query.date) : new Date().toISOString().split("T")[0].slice(0,7);
    // خذنا أول 7 حروف بشكل افتراضي (مثلاً 2025-06) لو ما أعطى المستخدم تاريخ

    const dbRef = ref(database, 'dailyTotal');

    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "لا توجد بيانات"
      });
    }

    const data = snapshot.val(); // هذا كائن يحتوي مفاتيح التواريخ (مثل 2025-06-16)

    // فلترة المفاتيح التي تحتوي substring التاريخ
    const filteredEntries = Object.entries(data).filter(([key, value]) => key.includes(dateSubstring));

    // ممكن تجمع النتائج حسب حاجتك، هنا أرسلهم كما هم
    const result = Object.fromEntries(filteredEntries);

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
