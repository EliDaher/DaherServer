import { Request, Response } from "express";
const { ref, get, child, push, set, update, runTransaction } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

interface UserSummary {
  id: string;
  count: number;
  total: number;
}

type BillCategoryKey =
  | "internetTotal"
  | "elecTotal"
  | "waterTotal"
  | "phoneTotal"
  | "otherTotal";

type BillCategoryTotals = Record<BillCategoryKey, number>;

type BillTransactionCategory = "elecTotal" | "phoneTotal";

type BillInvoiceDetail = {
  category?: BillCategoryKey;
  customerDetails?: string;
  customerName?: string;
  customerNumber?: string;
  invoiceNumber?: string;
  invoiceValue?: number | string;
};

const BILL_CATEGORY_LABELS: Record<BillCategoryKey, string> = {
  internetTotal: "إنترنت",
  elecTotal: "كهرباء",
  waterTotal: "مياه",
  phoneTotal: "أرضي",
  otherTotal: "أخرى",
};

const BILL_CATEGORY_KEYS = Object.keys(BILL_CATEGORY_LABELS) as BillCategoryKey[];
const BILL_TRANSACTION_PATHS: Record<BillTransactionCategory, string> = {
  elecTotal: "billElectricityTransactions",
  phoneTotal: "billPhoneTransactions",
};

function toNumber(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeCategoryTotals(value: any): BillCategoryTotals {
  return {
    internetTotal: toNumber(value?.internetTotal),
    elecTotal: toNumber(value?.elecTotal),
    waterTotal: toNumber(value?.waterTotal),
    phoneTotal: toNumber(value?.phoneTotal),
    otherTotal: toNumber(value?.otherTotal),
  };
}

function sumCategoryTotals(totals: BillCategoryTotals) {
  return BILL_CATEGORY_KEYS.reduce((sum, key) => sum + totals[key], 0);
}

function emptyCategoryTotals(): BillCategoryTotals {
  return {
    internetTotal: 0,
    elecTotal: 0,
    waterTotal: 0,
    phoneTotal: 0,
    otherTotal: 0,
  };
}

function isBillCategoryKey(value: unknown): value is BillCategoryKey {
  return BILL_CATEGORY_KEYS.includes(value as BillCategoryKey);
}

function isBillTransactionCategory(
  value: unknown,
): value is BillTransactionCategory {
  return value === "elecTotal" || value === "phoneTotal";
}

function getBillTransactionCategory(value: unknown): BillTransactionCategory {
  return isBillTransactionCategory(value) ? value : "elecTotal";
}

function getBillTransactionPath(category: BillTransactionCategory) {
  return BILL_TRANSACTION_PATHS[category];
}

function getBillTransactionLabel(category: BillTransactionCategory) {
  return category === "phoneTotal" ? "Phone" : "Electricity";
}

function normalizeInvoiceDetail(value: any): BillInvoiceDetail {
  const category = isBillCategoryKey(value?.category) ? value.category : undefined;

  return {
    ...value,
    ...(category ? { category } : {}),
  };
}

function toReviewedBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "reviewed" || value === "1";
  }

  return Boolean(value);
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

export const addBillInvoice = async (req: Request, res: Response) => {
  try {
    const employee = String(req.body?.employee || "").trim();
    const details: BillInvoiceDetail[] = Array.isArray(req.body?.details)
      ? req.body.details.map(normalizeInvoiceDetail)
      : [];
    const categoryTotals = normalizeCategoryTotals(req.body?.categoryTotals);
    const amount = sumCategoryTotals(categoryTotals);
    const date = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "employee is required.",
      });
    }

    // if (amount <= 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "categoryTotals must include a positive amount.",
    //   });
    // }

    const invoiceRef = push(ref(database, `dailyTotal/${date}/${employee}`));
    const operation = {
      id: invoiceRef.key,
      amount,
      categoryTotals,
      details,
      employee,
      timestamp: date,
      createdAt: now,
    };

    await set(invoiceRef, operation);

    const transactionCategories: BillTransactionCategory[] = [
      "elecTotal",
      "phoneTotal",
    ];

    await Promise.all(
      transactionCategories.flatMap((category) =>
        details
          .filter((detail) => detail.category === category)
          .map((detail) => {
            const transactionRef = push(
              ref(database, `${getBillTransactionPath(category)}/${date}`),
            );
            const transaction = {
              id: transactionRef.key,
              invoiceId: invoiceRef.key,
              employee,
              date,
              createdAt: now,
              reviewed: false,
              category,
              customerName: detail.customerName || "",
              customerNumber: detail.customerNumber || "",
              customerDetails: detail.customerDetails || "",
              invoiceNumber: detail.invoiceNumber || "",
              invoiceValue: toNumber(detail.invoiceValue),
            };

            return set(transactionRef, transaction);
          }),
      ),
    );

    const summaryRef = ref(database, `billCategoryTotals/${date}/${employee}`);

    await runTransaction(summaryRef, (currentSummary: any) => {
      const previousTotals = normalizeCategoryTotals(currentSummary);
      const nextTotals = BILL_CATEGORY_KEYS.reduce(
        (acc, key) => ({
          ...acc,
          [key]: previousTotals[key] + categoryTotals[key],
        }),
        emptyCategoryTotals(),
      );

      return {
        ...currentSummary,
        ...nextTotals,
        date,
        employee,
        total: sumCategoryTotals(nextTotals),
        operationCount: toNumber(currentSummary?.operationCount) + 1,
        updatedAt: now,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Bill invoice added successfully.",
      id: invoiceRef.key,
      data: operation,
    });
  } catch (error: any) {
    console.error("Error adding bill invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add bill invoice.",
      error: error.message,
    });
  }
};

export const getBillCategoryTotals = async (req: Request, res: Response) => {
  try {
    const date = String(
      req.query.date || new Date().toISOString().split("T")[0],
    );
    const employeeFilter = String(req.query.employee || "all").trim();
    const categoryFilter = String(req.query.category || "all").trim();
    const snapshot = await get(child(ref(database), `billCategoryTotals/${date}`));

    const rows = snapshot.exists()
      ? Object.entries(snapshot.val()).map(([employee, value]: [string, any]) => ({
          employee,
          ...normalizeCategoryTotals(value),
          total: toNumber(value?.total) || sumCategoryTotals(normalizeCategoryTotals(value)),
          operationCount: toNumber(value?.operationCount),
          updatedAt: value?.updatedAt || null,
        }))
      : [];

    const filteredRows =
      employeeFilter && employeeFilter !== "all"
        ? rows.filter((row) => row.employee === employeeFilter)
        : rows;

    const totals = filteredRows.reduce(
      (acc, row) => {
        BILL_CATEGORY_KEYS.forEach((key) => {
          acc[key] += row[key];
        });

        return acc;
      },
      emptyCategoryTotals(),
    );

    const byEmployee = filteredRows.map((row) => ({
      employee: row.employee,
      internetTotal: categoryFilter === "all" || categoryFilter === "internetTotal" ? row.internetTotal : 0,
      elecTotal: categoryFilter === "all" || categoryFilter === "elecTotal" ? row.elecTotal : 0,
      waterTotal: categoryFilter === "all" || categoryFilter === "waterTotal" ? row.waterTotal : 0,
      phoneTotal: categoryFilter === "all" || categoryFilter === "phoneTotal" ? row.phoneTotal : 0,
      otherTotal: categoryFilter === "all" || categoryFilter === "otherTotal" ? row.otherTotal : 0,
      total:
        categoryFilter === "all"
          ? row.total
          : toNumber(row[categoryFilter as BillCategoryKey]),
    }));

    const byCategory = BILL_CATEGORY_KEYS.map((key) => ({
      category: key,
      label: BILL_CATEGORY_LABELS[key],
      total: totals[key],
    })).filter((row) => categoryFilter === "all" || row.category === categoryFilter);

    const filteredTotals =
      categoryFilter === "all"
        ? { ...totals, total: sumCategoryTotals(totals) }
        : {
            ...emptyCategoryTotals(),
            [categoryFilter]: toNumber(totals[categoryFilter as BillCategoryKey]),
            total: toNumber(totals[categoryFilter as BillCategoryKey]),
          };

    return res.status(200).json({
      success: true,
      date,
      totals: filteredTotals,
      byEmployee,
      byCategory,
    });
  } catch (error: any) {
    console.error("Error fetching bill category totals:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bill category totals.",
      error: error.message,
    });
  }
};

export const getElectricityTransactions = async (req: Request, res: Response) => {
  try {
    const requestedDate = String(req.query.date || "").trim();
    const allDates =
      req.query.allDates === "true" ||
      req.query.allDates === "1" ||
      !requestedDate;
    const date = requestedDate || new Date().toISOString().split("T")[0];
    const employeeFilter = String(req.query.employee || "all").trim();
    const reviewedFilter = String(req.query.reviewed || "all").trim();
    const category = getBillTransactionCategory(req.query.category);
    const transactionPath = getBillTransactionPath(category);
    const snapshot = await get(
      child(ref(database), allDates ? transactionPath : `${transactionPath}/${date}`),
    );

    const rows = (() => {
      if (!snapshot.exists()) {
        return [];
      }

      const snapshotValue = snapshot.val();

      if (!allDates) {
        return Object.entries(snapshotValue).map(([id, value]: [string, any]) => ({
          id,
          ...value,
          date: value?.date || date,
          reviewed: Boolean(value?.reviewed),
        }));
      }

      return Object.entries(snapshotValue).flatMap(
        ([transactionDate, transactionsByDate]: [string, any]) =>
          Object.entries(transactionsByDate || {}).map(
            ([id, value]: [string, any]) => ({
              id,
              ...value,
              date: value?.date || transactionDate,
              reviewed: Boolean(value?.reviewed),
            }),
          ),
      );
    })();

    const filteredRows = rows
      .filter((row: any) =>
        employeeFilter && employeeFilter !== "all"
          ? row.employee === employeeFilter
          : true,
      )
      .filter((row: any) =>
        reviewedFilter && reviewedFilter !== "all"
          ? row.reviewed === toReviewedBoolean(reviewedFilter)
          : true,
      )
      .sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();

        return bTime - aTime;
      });

    return res.status(200).json({
      success: true,
      date: allDates ? "all" : date,
      allDates,
      category,
      data: filteredRows,
    });
  } catch (error: any) {
    console.error("Error fetching bill transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bill transactions.",
      error: error.message,
    });
  }
};

export const updateElectricityTransactionReviewed = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = String(req.params.id || "").trim();
    const date = String(req.body?.date || "").trim();
    const reviewed = toReviewedBoolean(req.body?.reviewed);
    const category = getBillTransactionCategory(req.body?.category);
    const transactionLabel = getBillTransactionLabel(category);
    const now = new Date().toISOString();

    if (!id || !date) {
      return res.status(400).json({
        success: false,
        message: "id and date are required.",
      });
    }

    const transactionRef = ref(
      database,
      `${getBillTransactionPath(category)}/${date}/${id}`,
    );
    const snapshot = await get(transactionRef);

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: `${transactionLabel} transaction not found.`,
      });
    }

    await update(transactionRef, {
      reviewed,
      reviewedAt: now,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...snapshot.val(),
        id,
        reviewed,
        reviewedAt: now,
        category,
      },
    });
  } catch (error: any) {
    console.error("Error updating bill transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update bill transaction.",
      error: error.message,
    });
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
