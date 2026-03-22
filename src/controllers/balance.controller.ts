import { Request, Response } from "express";
const { ref, get, child, push, set } = require("firebase/database");
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

export const getEmployeeBalanceTable = async (req: Request, res: Response) => {
  try {
    const username = String(req.query.username || "");
    const date = String(req.query.date || "");

    if (!username || !date) {
      return res.status(400).json({ success: false, message: "username and date are required." });
    }

    const dbRef = ref(database);
    let invoiceList: any[] = [];

    if (username !== "all") {
      const snapshot = await get(child(dbRef, `dailyTotal/${date}/${username}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        invoiceList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      }
    } else {
      const snapshot = await get(child(dbRef, `dailyTotal/${date}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        invoiceList = Object.keys(data).flatMap(emp =>
          Object.keys(data[emp] || {}).map(key => ({
            employee: emp,
            id: key,
            ...data[emp][key]
          }))
        );
      }
    }

    return res.json({ success: true, data: invoiceList });

  } catch (error) {
    console.error("Error fetching employee balance table:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getDailyBalance = async (req: Request, res: Response) => {
  const dbRef = ref(database);

  try {
    const snapshot = await get(child(dbRef, `dailyBalance`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const balanceList = Object.values(data); // تحويل البيانات إلى قائمة
      return res.status(200).json(balanceList);
    } else {
      console.log("لا توجد بيانات متاحة في dailyBalance.");
      return res.status(404).json({ message: "لا توجد بيانات متاحة." });
    }
  } catch (error: any) {
    console.error("حدث خطأ أثناء جلب بيانات الأرصدة:", error.message);
    return res.status(500).json({ error: "فشل في جلب بيانات الأرصدة." });
  }
};

export const addMofadale = async (req: Request, res: Response) => {
  try {
    const subscribersRef = ref(database, "mofadale");
    const newRef = push(subscribersRef);
    const newMofadale = req.body;

    await set(newRef, newMofadale); 

    res.status(200).json({
      success: true,
      message: "تم إضافة المشترك بنجاح ✅",
      id: newRef.key,
      data: newMofadale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء الإضافة ❌",
      error: (error as Error).message,
    });
  }
};

export const getEmployeesDashboard = async (req: Request, res: Response) => {
  try {
    const date = String(
      req.query.date || new Date().toISOString().split("T")[0],
    );
    const search = String(req.query.search || "")
      .trim()
      .toLowerCase();

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `dailyTotal/${date}`));

    if (!snapshot.exists()) {
      return res.status(200).json({
        success: true,
        date,
        kpis: {
          topEmployee: null,
          totalAmount: 0,
          totalOperations: 0,
          employeesActive: 0,
        },
        employeesSummary: [],
        employeesOperations: [],
      });
    }

    const data = snapshot.val();
    const summaryMap: Record<string, { employee: string; operations: number; total: number }> = {};
    const operations: any[] = [];

    Object.entries(data).forEach(([employeeKey, employeeOperations]: [string, any]) => {
      const ops = Object.values(employeeOperations || {}) as any[];
      let employeeTotal = 0;
      let employeeCount = 0;

      ops.forEach((op: any) => {
        const amount = Number(op?.amount) || 0;
        const detailsObject = op?.details || {};
        const customerDetails = detailsObject?.customerDetails || "";
        const customerName = detailsObject?.customerName || "";
        const customerNumber = detailsObject?.customerNumber?.toString?.() || "";
        const invoiceNumber = detailsObject?.invoiceNumber?.toString?.() || "";

        const detailsText =
          customerDetails ||
          customerName ||
          (typeof op?.details === "string" ? op.details : "");

        const operation = {
          id: op?.id || null,
          employee: op?.employee || employeeKey,
          amount,
          details: detailsText,
          timestamp: op?.timestamp || null,
          customerName,
          customerNumber,
          invoiceNumber,
        };

        const searchable = [
          operation.employee,
          detailsText,
          customerName,
          customerNumber,
          invoiceNumber,
        ]
          .join(" ")
          .toLowerCase();

        if (!search || searchable.includes(search)) {
          operations.push(operation);
          employeeTotal += amount;
          employeeCount += 1;
        }
      });

      if (employeeCount > 0) {
        summaryMap[employeeKey] = {
          employee: employeeKey,
          operations: employeeCount,
          total: employeeTotal,
        };
      }
    });

    const employeesSummary = Object.values(summaryMap).sort(
      (a, b) => b.total - a.total,
    );

    const employeesOperations = operations.sort((a, b) => {
      const tA = new Date(a.timestamp || 0).getTime();
      const tB = new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });

    const totalAmount = employeesSummary.reduce((sum, row) => sum + row.total, 0);
    const totalOperations = employeesSummary.reduce(
      (sum, row) => sum + row.operations,
      0,
    );
    const employeesActive = employeesSummary.length;
    const topEmployee = employeesSummary[0] || null;

    return res.status(200).json({
      success: true,
      date,
      kpis: {
        topEmployee,
        totalAmount,
        totalOperations,
        employeesActive,
      },
      employeesSummary,
      employeesOperations,
    });
  } catch (error: any) {
    console.error("Error fetching employees dashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees dashboard data",
      error: error.message,
    });
  }
};
