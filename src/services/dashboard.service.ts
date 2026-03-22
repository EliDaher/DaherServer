import { get, ref } from "firebase/database";
const { database } = require("../../firebaseConfig.js");

type FirebaseMap = Record<string, any>;

type TimelineBucket = {
  key: string;
  label: string;
  sales: number;
  payments: number;
  expenses: number;
  purchases: number;
};

const toNumber = (value: any): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);
const monthKey = (date: Date): string => date.toISOString().slice(0, 7);

const getTrailingKeys = (count: number, unit: "day" | "month"): string[] => {
  const now = new Date();
  const keys: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (unit === "day") {
      d.setDate(now.getDate() - i);
      keys.push(dateKey(d));
    } else {
      d.setMonth(now.getMonth() - i);
      keys.push(monthKey(d));
    }
  }

  return keys;
};

const buildTimeline = (
  keys: string[],
  salesMap: Record<string, number>,
  paymentsMap: Record<string, number>,
  expensesMap: Record<string, number>,
  purchasesMap: Record<string, number>,
): TimelineBucket[] =>
  keys.map((key) => ({
    key,
    label: key,
    sales: salesMap[key] || 0,
    payments: paymentsMap[key] || 0,
    expenses: expensesMap[key] || 0,
    purchases: purchasesMap[key] || 0,
  }));

export const getDashboardOverview = async () => {
  const [
    subscribersSnap,
    invoicesSnap,
    paymentsSnap,
    wifiExpensesSnap,
    companiesSnap,
    balanceLogsSnap,
    dailyTotalSnap,
  ] = await Promise.all([
    get(ref(database, "Subscribers")),
    get(ref(database, "Invoices")),
    get(ref(database, "Payments")),
    get(ref(database, "WifiBalance")),
    get(ref(database, "companies")),
    get(ref(database, "balanceLogs")),
    get(ref(database, "dailyTotal")),
  ]);

  const subscribers: FirebaseMap = subscribersSnap.exists()
    ? subscribersSnap.val()
    : {};
  const invoices: FirebaseMap = invoicesSnap.exists() ? invoicesSnap.val() : {};
  const payments: FirebaseMap = paymentsSnap.exists() ? paymentsSnap.val() : {};
  const wifiExpenses: FirebaseMap = wifiExpensesSnap.exists()
    ? wifiExpensesSnap.val()
    : {};
  const companies: FirebaseMap = companiesSnap.exists() ? companiesSnap.val() : {};
  const balanceLogs: FirebaseMap = balanceLogsSnap.exists()
    ? balanceLogsSnap.val()
    : {};
  const dailyTotal: FirebaseMap = dailyTotalSnap.exists() ? dailyTotalSnap.val() : {};

  const subscriberList = Object.values(subscribers);
  const invoiceList = Object.values(invoices);
  const paymentList = Object.values(payments);
  const wifiExpenseList = Object.values(wifiExpenses);
  const companyList: any[] = Object.entries(companies).map(([id, company]) => ({
    id,
    ...(company as Record<string, any>),
  }));

  const decreaseLogs: any[] = [];
  Object.values(balanceLogs).forEach((dayLogs: any) => {
    Object.values(dayLogs || {}).forEach((log: any) => {
      if (log?.type === "decrease") decreaseLogs.push(log);
    });
  });

  const totalCustomers = subscriberList.length;
  const totalSuppliers = companyList.length;
  const totalSales = invoiceList.length;
  const totalPurchases = decreaseLogs.length;

  const totalSalesAmount = invoiceList.reduce(
    (sum, invoice: any) => sum + toNumber(invoice.Amount),
    0,
  );
  const totalRevenue = paymentList.reduce(
    (sum, payment: any) => sum + toNumber(payment.Amount),
    0,
  );
  const totalWifiExpenses = wifiExpenseList.reduce(
    (sum, expense: any) => sum + toNumber(expense.amount),
    0,
  );
  const totalPurchaseAmount = decreaseLogs.reduce(
    (sum, log: any) => sum + toNumber(log.amount),
    0,
  );
  const totalCost = totalWifiExpenses + totalPurchaseAmount;
  const totalProfit = totalRevenue - totalCost;

  const outOfStockItems = companyList
    .filter((company) => toNumber(company.balance) <= 0)
    .map((company) => ({
      id: company.id,
      name: company.name || "Unknown",
      balance: toNumber(company.balance),
      balanceLimit: toNumber(company.balanceLimit),
      lastUpdate: company.lastUpdate || null,
    }));

  const lowStockItems = companyList
    .filter((company) => {
      const balance = toNumber(company.balance);
      const limit = toNumber(company.balanceLimit);
      return limit > 0 && balance > 0 && balance <= limit;
    })
    .map((company) => ({
      id: company.id,
      name: company.name || "Unknown",
      balance: toNumber(company.balance),
      balanceLimit: toNumber(company.balanceLimit),
      lastUpdate: company.lastUpdate || null,
    }));

  const recentTransactions: any[] = [];

  invoiceList.forEach((invoice: any) => {
    const parsed = parseDate(invoice.Date);
    recentTransactions.push({
      id: invoice.InvoiceID || invoice.id || null,
      source: "Invoices",
      type: "sale_invoice",
      amount: toNumber(invoice.Amount),
      date: invoice.Date || null,
      timestamp: parsed ? parsed.getTime() : 0,
      details: invoice.Details || null,
      subscriberId: invoice.SubscriberID || null,
    });
  });

  paymentList.forEach((payment: any) => {
    const parsed = parseDate(payment.Date);
    recentTransactions.push({
      id: payment.PaymentID || payment.id || null,
      source: "Payments",
      type: "customer_payment",
      amount: toNumber(payment.Amount),
      date: payment.Date || null,
      timestamp: parsed ? parsed.getTime() : 0,
      details: payment.Details || null,
      subscriberId: payment.SubscriberID || null,
    });
  });

  wifiExpenseList.forEach((expense: any) => {
    const parsed = parseDate(expense.timestamp);
    recentTransactions.push({
      id: expense.id || null,
      source: "WifiBalance",
      type: "wifi_expense",
      amount: toNumber(expense.amount),
      date: expense.timestamp || null,
      timestamp: parsed ? parsed.getTime() : 0,
      details: expense.details || null,
      subscriberId: null,
    });
  });

  decreaseLogs.forEach((log: any) => {
    const parsed = parseDate(log.date);
    recentTransactions.push({
      id: null,
      source: "balanceLogs",
      type: "supplier_purchase",
      amount: toNumber(log.amount),
      date: log.date || null,
      timestamp: parsed ? parsed.getTime() : 0,
      details: log.reason || log.company || null,
      subscriberId: null,
    });
  });

  const sortedTransactions = recentTransactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  const bestSellingMap: Record<string, { count: number; amount: number }> = {};
  Object.values(dailyTotal).forEach((dayData: any) => {
    Object.values(dayData || {}).forEach((employeeData: any) => {
      Object.values(employeeData || {}).forEach((entry: any) => {
        const details = entry?.details || {};
        const name =
          details.customerDetails ||
          details.customerName ||
          "Unknown service";
        if (!bestSellingMap[name]) bestSellingMap[name] = { count: 0, amount: 0 };
        bestSellingMap[name].count += 1;
        bestSellingMap[name].amount += toNumber(entry?.amount);
      });
    });
  });

  const bestSellingProducts = Object.entries(bestSellingMap)
    .map(([name, values]) => ({
      name,
      soldCount: values.count,
      totalAmount: values.amount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  const salesByMonth: Record<string, number> = {};
  const paymentsByMonth: Record<string, number> = {};
  const expensesByMonth: Record<string, number> = {};
  const purchasesByMonth: Record<string, number> = {};

  const salesByDay: Record<string, number> = {};
  const paymentsByDay: Record<string, number> = {};
  const expensesByDay: Record<string, number> = {};
  const purchasesByDay: Record<string, number> = {};

  invoiceList.forEach((invoice: any) => {
    const parsed = parseDate(invoice.Date);
    if (!parsed) return;
    const dKey = dateKey(parsed);
    const mKey = monthKey(parsed);
    salesByDay[dKey] = (salesByDay[dKey] || 0) + toNumber(invoice.Amount);
    salesByMonth[mKey] = (salesByMonth[mKey] || 0) + toNumber(invoice.Amount);
  });

  paymentList.forEach((payment: any) => {
    const parsed = parseDate(payment.Date);
    if (!parsed) return;
    const dKey = dateKey(parsed);
    const mKey = monthKey(parsed);
    paymentsByDay[dKey] = (paymentsByDay[dKey] || 0) + toNumber(payment.Amount);
    paymentsByMonth[mKey] =
      (paymentsByMonth[mKey] || 0) + toNumber(payment.Amount);
  });

  wifiExpenseList.forEach((expense: any) => {
    const parsed = parseDate(expense.timestamp);
    if (!parsed) return;
    const dKey = dateKey(parsed);
    const mKey = monthKey(parsed);
    expensesByDay[dKey] = (expensesByDay[dKey] || 0) + toNumber(expense.amount);
    expensesByMonth[mKey] =
      (expensesByMonth[mKey] || 0) + toNumber(expense.amount);
  });

  decreaseLogs.forEach((log: any) => {
    const parsed = parseDate(log.date);
    if (!parsed) return;
    const dKey = dateKey(parsed);
    const mKey = monthKey(parsed);
    purchasesByDay[dKey] = (purchasesByDay[dKey] || 0) + toNumber(log.amount);
    purchasesByMonth[mKey] =
      (purchasesByMonth[mKey] || 0) + toNumber(log.amount);
  });

  const monthlyKeys = getTrailingKeys(12, "month");
  const dailyKeys = getTrailingKeys(30, "day");

  const monthlyOverview = buildTimeline(
    monthlyKeys,
    salesByMonth,
    paymentsByMonth,
    expensesByMonth,
    purchasesByMonth,
  ).map((item) => {
    const costs = item.expenses + item.purchases;
    return {
      month: item.key,
      sales: item.sales,
      payments: item.payments,
      expenses: item.expenses,
      purchases: item.purchases,
      profit: item.payments - costs,
      netCashFlow: item.payments - costs,
    };
  });

  const dailyOverview = buildTimeline(
    dailyKeys,
    salesByDay,
    paymentsByDay,
    expensesByDay,
    purchasesByDay,
  ).map((item) => {
    const costs = item.expenses + item.purchases;
    return {
      date: item.key,
      sales: item.sales,
      payments: item.payments,
      expenses: item.expenses,
      purchases: item.purchases,
      profit: item.payments - costs,
      netCashFlow: item.payments - costs,
    };
  });

  return {
    summary: {
      totalProducts: null,
      totalCustomers,
      totalSuppliers,
      totalSales,
      totalPurchases,
      totalRevenue,
      totalProfit,
      totalSalesAmount,
      totalCost,
      lowStockItemsCount: lowStockItems.length,
      outOfStockItemsCount: outOfStockItems.length,
    },
    inventory: {
      lowStockItems,
      outOfStockItems,
      note: "Stock KPIs are derived from companies.balance and companies.balanceLimit.",
    },
    recentTransactions: sortedTransactions,
    bestSellingProducts,
    monthlyOverview,
    dailyOverview,
    charts: {
      revenueVsCostMonthly: monthlyOverview.map((item) => ({
        label: item.month,
        revenue: item.payments,
        cost: item.expenses + item.purchases,
        profit: item.profit,
      })),
      cashFlowDaily: dailyOverview.map((item) => ({
        label: item.date,
        inflow: item.payments,
        outflow: item.expenses + item.purchases,
        net: item.netCashFlow,
      })),
      transactionMix: [
        { label: "Invoices", value: totalSales },
        { label: "Payments", value: paymentList.length },
        { label: "WifiExpenses", value: wifiExpenseList.length },
        { label: "SupplierPurchases", value: totalPurchases },
      ],
      topSelling: bestSellingProducts.map((item) => ({
        label: item.name,
        soldCount: item.soldCount,
        totalAmount: item.totalAmount,
      })),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      sourceCollections: [
        "Subscribers",
        "Invoices",
        "Payments",
        "WifiBalance",
        "companies",
        "balanceLogs",
        "dailyTotal",
      ],
      unsupportedKpis: ["totalProducts"],
    },
  };
};
