"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayOverviewReport = void 0;
const database_1 = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const REPORT_TIMEZONE = "Asia/Damascus";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RAW_LIMIT = 5;
const MAX_RAW_LIMIT = 25;
const BACKLOG_COUNT_THRESHOLD = 8;
const BACKLOG_AGE_HOURS_THRESHOLD = 24;
const HIGH_BACKLOG_COUNT_THRESHOLD = 20;
const HIGH_BACKLOG_AGE_HOURS_THRESHOLD = 72;
const DROP_RATIO_THRESHOLD = 0.4;
const SPIKE_RATIO_THRESHOLD = 2;
function toNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}
function toSafeString(value, fallback = "") {
    if (typeof value !== "string")
        return fallback;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
function toSnapshotMap(snapshot) {
    var _a;
    if (!((_a = snapshot === null || snapshot === void 0 ? void 0 : snapshot.exists) === null || _a === void 0 ? void 0 : _a.call(snapshot))) {
        return {};
    }
    const raw = snapshot.val();
    if (!raw || typeof raw !== "object") {
        return {};
    }
    return raw;
}
function toDamascusDateKey(date) {
    return date.toLocaleDateString("en-CA", { timeZone: REPORT_TIMEZONE });
}
function isValidDateKey(value) {
    if (!DATE_KEY_PATTERN.test(value))
        return false;
    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)) {
        return false;
    }
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() + 1 === month &&
        parsed.getUTCDate() === day);
}
function resolveDateKey(input) {
    if (input === undefined || input === null || String(input).trim() === "") {
        return toDamascusDateKey(new Date());
    }
    const normalized = String(input).trim();
    if (!isValidDateKey(normalized)) {
        throw new Error("VALIDATION:Invalid date format. Expected YYYY-MM-DD.");
    }
    return normalized;
}
function resolveRawLimit(input) {
    if (input === undefined || input === null || input === "") {
        return DEFAULT_RAW_LIMIT;
    }
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_RAW_LIMIT;
    }
    return Math.min(Math.floor(parsed), MAX_RAW_LIMIT);
}
function toTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        const normalized = value > 0 && value < 1000000000000 ? value * 1000 : value;
        const date = new Date(normalized);
        return Number.isNaN(date.getTime()) ? null : date.getTime();
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        if (DATE_KEY_PATTERN.test(trimmed) && isValidDateKey(trimmed)) {
            const isoLike = `${trimmed}T00:00:00+03:00`;
            const parsedDate = new Date(isoLike);
            return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
        }
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) {
            return toTimestamp(numeric);
        }
        const parsedDate = new Date(trimmed);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.getTime();
    }
    return null;
}
function toDateKey(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (DATE_KEY_PATTERN.test(trimmed)) {
            return isValidDateKey(trimmed) ? trimmed : null;
        }
    }
    const timestamp = toTimestamp(value);
    if (timestamp === null)
        return null;
    return toDamascusDateKey(new Date(timestamp));
}
function shiftDateKey(dateKey, deltaDays) {
    const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
    return shifted.toISOString().slice(0, 10);
}
function getPreviousDateKeys(dateKey, count) {
    const keys = [];
    for (let i = 1; i <= count; i += 1) {
        keys.push(shiftDateKey(dateKey, -i));
    }
    return keys;
}
function getRecordTimestamp(record) {
    return (toTimestamp(record.timestamp) ||
        toTimestamp(record.createdAt) ||
        toTimestamp(record.date) ||
        toTimestamp(record.isoTime));
}
function isFailedOperationState(value) {
    const normalized = String(value || "")
        .toLowerCase()
        .trim();
    return normalized.includes("fail") || normalized.includes("error");
}
function averageForDateKeys(map, keys) {
    if (keys.length === 0)
        return 0;
    const total = keys.reduce((sum, key) => sum + toNumber(map[key]), 0);
    return total / keys.length;
}
function pushAnomaly(anomalies, anomaly) {
    if (!anomaly)
        return;
    anomalies.push(anomaly);
}
const getTodayOverviewReport = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (params = {}) {
    const dateKey = resolveDateKey(params.date);
    const rawLimit = resolveRawLimit(params.rawLimit);
    const nowMs = Date.now();
    const [subscribersSnap, companiesSnap, dailyTotalSnap, invoicesSnap, paymentsSnap, balanceLogsTodaySnap, wifiBalanceSnap, pendingExchangeSnap, doneExchangeSnap, operationsLogsTodaySnap, inquiryLogsTodaySnap, posProfitTodaySnap,] = yield Promise.all([
        (0, database_1.get)((0, database_1.ref)(database, "Subscribers")),
        (0, database_1.get)((0, database_1.ref)(database, "companies")),
        (0, database_1.get)((0, database_1.ref)(database, `dailyTotal/${dateKey}`)),
        (0, database_1.get)((0, database_1.ref)(database, "Invoices")),
        (0, database_1.get)((0, database_1.ref)(database, "Payments")),
        (0, database_1.get)((0, database_1.ref)(database, `balanceLogs/${dateKey}`)),
        (0, database_1.get)((0, database_1.ref)(database, "WifiBalance")),
        (0, database_1.get)((0, database_1.ref)(database, "exchange/pending")),
        (0, database_1.get)((0, database_1.ref)(database, "exchange/done")),
        (0, database_1.get)((0, database_1.ref)(database, `operationsLogs/${dateKey}`)),
        (0, database_1.get)((0, database_1.ref)(database, `astalamatLogs/${dateKey}`)),
        (0, database_1.get)((0, database_1.ref)(database, `profitLogs/posInvoices/${dateKey}`)),
    ]);
    const subscribersMap = toSnapshotMap(subscribersSnap);
    const companiesMap = toSnapshotMap(companiesSnap);
    const dailyTotalMap = toSnapshotMap(dailyTotalSnap);
    const invoicesMap = toSnapshotMap(invoicesSnap);
    const paymentsMap = toSnapshotMap(paymentsSnap);
    const balanceLogsTodayMap = toSnapshotMap(balanceLogsTodaySnap);
    const wifiBalanceMap = toSnapshotMap(wifiBalanceSnap);
    const pendingExchangeMap = toSnapshotMap(pendingExchangeSnap);
    const doneExchangeMap = toSnapshotMap(doneExchangeSnap);
    const operationsLogsTodayMap = toSnapshotMap(operationsLogsTodaySnap);
    const inquiryLogsTodayMap = toSnapshotMap(inquiryLogsTodaySnap);
    const posProfitTodayMap = toSnapshotMap(posProfitTodaySnap);
    const invoices = Object.values(invoicesMap);
    const payments = Object.values(paymentsMap);
    const wifiExpenses = Object.values(wifiBalanceMap);
    const invoicesToday = invoices.filter((invoice) => toDateKey(invoice.Date) === dateKey);
    const paymentsToday = payments.filter((payment) => toDateKey(payment.Date) === dateKey);
    const wifiExpensesToday = wifiExpenses.filter((expense) => toDateKey(expense.timestamp) === dateKey);
    const invoicesCount = invoicesToday.length;
    const invoicesAmount = invoicesToday.reduce((sum, invoice) => sum + toNumber(invoice.Amount), 0);
    const paymentsCount = paymentsToday.length;
    const paymentsAmount = paymentsToday.reduce((sum, payment) => sum + toNumber(payment.Amount), 0);
    const wifiExpenseAmount = wifiExpensesToday.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    const employeeSummaries = [];
    let posOperationsCount = 0;
    let posOperationsAmount = 0;
    Object.entries(dailyTotalMap).forEach(([employeeKey, operationsRaw]) => {
        const operations = Object.values((operationsRaw || {}));
        const employeeName = toSafeString(employeeKey, "unknown");
        let employeeCount = 0;
        let employeeTotal = 0;
        operations.forEach((operation) => {
            const amount = toNumber(operation.amount);
            employeeCount += 1;
            employeeTotal += amount;
            posOperationsCount += 1;
            posOperationsAmount += amount;
        });
        if (employeeCount > 0) {
            employeeSummaries.push({
                employee: employeeName,
                operations: employeeCount,
                totalAmount: employeeTotal,
            });
        }
    });
    employeeSummaries.sort((a, b) => b.totalAmount - a.totalAmount);
    const balanceLogsToday = Object.entries(balanceLogsTodayMap).map(([id, logRaw]) => (Object.assign({ id }, logRaw)));
    let increaseCount = 0;
    let decreaseCount = 0;
    let fixCount = 0;
    let supplierPurchaseAmount = 0;
    let companyTopupAmount = 0;
    balanceLogsToday.forEach((log) => {
        const type = toSafeString(log.type);
        const amount = toNumber(log.amount);
        if (type === "increase") {
            increaseCount += 1;
            companyTopupAmount += amount;
        }
        else if (type === "decrease") {
            decreaseCount += 1;
            supplierPurchaseAmount += amount;
        }
        else if (type === "fix") {
            fixCount += 1;
        }
    });
    const companies = Object.entries(companiesMap).map(([key, value]) => {
        const raw = (value || {});
        return {
            id: toSafeString(raw.id, key),
            name: toSafeString(raw.name, "Unknown"),
            balance: toNumber(raw.balance),
            balanceLimit: toNumber(raw.balanceLimit),
            lastUpdate: raw.lastUpdate ? String(raw.lastUpdate) : null,
        };
    });
    const lowOrOutCompanies = [];
    companies.forEach((company) => {
        if (company.balance <= 0) {
            lowOrOutCompanies.push(Object.assign(Object.assign({}, company), { status: "critical" }));
            return;
        }
        if (company.balanceLimit > 0 && company.balance <= company.balanceLimit) {
            lowOrOutCompanies.push(Object.assign(Object.assign({}, company), { status: "warning" }));
        }
    });
    lowOrOutCompanies.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === "critical" ? -1 : 1;
        }
        return a.balance - b.balance;
    });
    const criticalCompanies = lowOrOutCompanies.filter((company) => company.status === "critical");
    const warningCompanies = lowOrOutCompanies.filter((company) => company.status === "warning");
    const subscribers = Object.entries(subscribersMap).map(([key, value]) => {
        const raw = (value || {});
        return {
            id: toSafeString(raw.id, key),
            name: toSafeString(raw.Name, toSafeString(raw.name, "Unknown")),
            balance: toNumber(raw.Balance),
            dealer: raw.dealer ? String(raw.dealer) : null,
            sender: raw.sender ? String(raw.sender) : null,
        };
    });
    const topDebtors = subscribers
        .filter((subscriber) => subscriber.balance < 0)
        .map((subscriber) => ({
        id: subscriber.id,
        name: subscriber.name,
        balance: subscriber.balance,
        debtAmount: Math.abs(subscriber.balance),
        dealer: subscriber.dealer,
        sender: subscriber.sender,
    }))
        .sort((a, b) => b.debtAmount - a.debtAmount);
    const debtSubscribersCount = topDebtors.length;
    const debtTotalAmount = topDebtors.reduce((sum, subscriber) => sum + subscriber.debtAmount, 0);
    const pendingExchanges = Object.entries(pendingExchangeMap).map(([id, value]) => {
        const raw = (value || {});
        const timestamp = toTimestamp(raw.timestamp) ||
            toTimestamp(raw.createdAt) ||
            toTimestamp(raw.date);
        const ageHours = timestamp === null ? 0 : round2(Math.max(0, (nowMs - timestamp) / 3600000));
        return {
            id,
            sypAmount: toNumber(raw.sypAmount),
            usdAmount: toNumber(raw.usdAmount),
            details: toSafeString(raw.details),
            timestamp,
            ageHours,
        };
    });
    const pendingExchangeCount = pendingExchanges.length;
    const oldestPendingHours = pendingExchanges.reduce((max, item) => (item.ageHours > max ? item.ageHours : max), 0);
    pendingExchanges.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const doneExchanges = Object.entries(doneExchangeMap).map(([id, value]) => (Object.assign({ id }, (value || {}))));
    const doneExchangeCount = doneExchanges.filter((exchange) => {
        const timestamp = toTimestamp(exchange.timestamp) ||
            toTimestamp(exchange.createdAt) ||
            toTimestamp(exchange.date);
        const doneDateKey = toDateKey(timestamp);
        return doneDateKey === dateKey;
    }).length;
    const operationsLogsToday = Object.entries(operationsLogsTodayMap)
        .map(([id, value]) => {
        const raw = (value || {});
        return {
            id,
            executorName: toSafeString(raw.executorName, "unknown"),
            operationType: toSafeString(raw.operationType, "unknown"),
            note: toSafeString(raw.note),
            timestamp: getRecordTimestamp(raw),
            isoTime: raw.isoTime ? String(raw.isoTime) : null,
        };
    })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const inquiryLogsToday = Object.entries(inquiryLogsTodayMap)
        .map(([id, value]) => {
        const raw = (value || {});
        return {
            id,
            type: toSafeString(raw.type, "unknown"),
            from: toSafeString(raw.from, "unknown"),
            target: toSafeString(raw.target, "unknown"),
            message: toSafeString(raw.message),
            time: raw.time ? String(raw.time) : null,
            date: raw.date ? String(raw.date) : null,
            timestamp: getRecordTimestamp(raw),
        };
    })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const posProfitTodayLogs = Object.values(posProfitTodayMap);
    const posProfitTodayCount = posProfitTodayLogs.length;
    const posProfitTodayAmount = posProfitTodayLogs.reduce((sum, record) => sum + toNumber(record.amount), 0);
    const posProfitTodayProfitAmount = posProfitTodayLogs.reduce((sum, record) => sum + toNumber(record.profitAmount), 0);
    const failedPosProfitCount = posProfitTodayLogs.filter((record) => isFailedOperationState(record.operationState)).length;
    const netCashFlow = paymentsAmount - (wifiExpenseAmount + supplierPurchaseAmount);
    const invoiceAmountsByDay = {};
    const paymentAmountsByDay = {};
    invoices.forEach((invoice) => {
        const recordDateKey = toDateKey(invoice.Date);
        if (!recordDateKey)
            return;
        invoiceAmountsByDay[recordDateKey] =
            (invoiceAmountsByDay[recordDateKey] || 0) + toNumber(invoice.Amount);
    });
    payments.forEach((payment) => {
        const recordDateKey = toDateKey(payment.Date);
        if (!recordDateKey)
            return;
        paymentAmountsByDay[recordDateKey] =
            (paymentAmountsByDay[recordDateKey] || 0) + toNumber(payment.Amount);
    });
    const previousKeys = getPreviousDateKeys(dateKey, 7);
    const invoiceAverageLast7 = averageForDateKeys(invoiceAmountsByDay, previousKeys);
    const paymentAverageLast7 = averageForDateKeys(paymentAmountsByDay, previousKeys);
    const anomalies = [];
    pushAnomaly(anomalies, criticalCompanies.length > 0
        ? {
            severity: "high",
            code: "LOW_COMPANY_BALANCE_CRITICAL",
            message: `${criticalCompanies.length} companies are at or below zero balance.`,
            evidence: {
                count: criticalCompanies.length,
                companies: criticalCompanies.slice(0, 5).map((company) => ({
                    id: company.id,
                    name: company.name,
                    balance: company.balance,
                })),
            },
            suggestedAction: "Top up critical supplier balances immediately to prevent service interruption.",
        }
        : null);
    pushAnomaly(anomalies, warningCompanies.length > 0
        ? {
            severity: "medium",
            code: "LOW_COMPANY_BALANCE_WARNING",
            message: `${warningCompanies.length} companies are approaching their balance limits.`,
            evidence: {
                count: warningCompanies.length,
                companies: warningCompanies.slice(0, 5).map((company) => ({
                    id: company.id,
                    name: company.name,
                    balance: company.balance,
                    balanceLimit: company.balanceLimit,
                })),
            },
            suggestedAction: "Plan proactive top-ups for warning-level companies before they become critical.",
        }
        : null);
    pushAnomaly(anomalies, invoicesCount + paymentsCount + posOperationsCount === 0
        ? {
            severity: "medium",
            code: "NO_ACTIVITY_TODAY",
            message: "No invoices, payments, or POS operations were recorded for the selected date.",
            evidence: {
                invoicesCount,
                paymentsCount,
                posOperationsCount,
            },
            suggestedAction: "Verify integrations and staff workflow to confirm operational activity is being recorded.",
        }
        : null);
    pushAnomaly(anomalies, netCashFlow < 0
        ? {
            severity: "medium",
            code: "NET_CASHFLOW_NEGATIVE",
            message: "Today's net cash flow is negative.",
            evidence: {
                netCashFlow,
                paymentsAmount,
                wifiExpenseAmount,
                supplierPurchaseAmount,
            },
            suggestedAction: "Review high-cost outflows and prioritize payment collection to restore positive cash flow.",
        }
        : null);
    const hasBacklogAnomaly = pendingExchangeCount >= BACKLOG_COUNT_THRESHOLD ||
        oldestPendingHours > BACKLOG_AGE_HOURS_THRESHOLD;
    const isHighBacklog = pendingExchangeCount >= HIGH_BACKLOG_COUNT_THRESHOLD ||
        oldestPendingHours > HIGH_BACKLOG_AGE_HOURS_THRESHOLD;
    pushAnomaly(anomalies, hasBacklogAnomaly
        ? {
            severity: isHighBacklog ? "high" : "medium",
            code: "PENDING_EXCHANGE_BACKLOG",
            message: "Pending exchange workload is above the healthy backlog threshold.",
            evidence: {
                pendingExchangeCount,
                oldestPendingHours,
            },
            suggestedAction: "Assign a focused pass to clear old pending exchanges and reduce queue pressure.",
        }
        : null);
    pushAnomaly(anomalies, failedPosProfitCount > 0
        ? {
            severity: "medium",
            code: "FAILED_POS_PROFIT_OPERATIONS",
            message: `${failedPosProfitCount} POS profit logs indicate failed or error operation states.`,
            evidence: {
                failedPosProfitCount,
                affectedLogs: posProfitTodayLogs
                    .filter((record) => isFailedOperationState(record.operationState))
                    .slice(0, 5)
                    .map((record) => ({
                    id: toSafeString(record.id),
                    invoiceId: toSafeString(record.invoiceId),
                    operationState: toSafeString(record.operationState),
                })),
            },
            suggestedAction: "Inspect failed POS operations and retry or correct the impacted transactions.",
        }
        : null);
    if (invoiceAverageLast7 > 0) {
        const invoiceRatio = invoicesAmount / invoiceAverageLast7;
        pushAnomaly(anomalies, invoiceRatio < DROP_RATIO_THRESHOLD || invoiceRatio > SPIKE_RATIO_THRESHOLD
            ? {
                severity: "medium",
                code: "SIGNIFICANT_DROP_OR_SPIKE",
                message: invoiceRatio < DROP_RATIO_THRESHOLD
                    ? "Today's invoice amount is significantly below the 7-day average."
                    : "Today's invoice amount is significantly above the 7-day average.",
                evidence: {
                    metric: "invoicesAmount",
                    todayValue: invoicesAmount,
                    averageLast7Days: round2(invoiceAverageLast7),
                    ratio: round2(invoiceRatio),
                },
                suggestedAction: "Validate invoice volume changes against campaign plans, outages, or process issues.",
            }
            : null);
    }
    if (paymentAverageLast7 > 0) {
        const paymentRatio = paymentsAmount / paymentAverageLast7;
        pushAnomaly(anomalies, paymentRatio < DROP_RATIO_THRESHOLD || paymentRatio > SPIKE_RATIO_THRESHOLD
            ? {
                severity: "medium",
                code: "SIGNIFICANT_DROP_OR_SPIKE",
                message: paymentRatio < DROP_RATIO_THRESHOLD
                    ? "Today's payments amount is significantly below the 7-day average."
                    : "Today's payments amount is significantly above the 7-day average.",
                evidence: {
                    metric: "paymentsAmount",
                    todayValue: paymentsAmount,
                    averageLast7Days: round2(paymentAverageLast7),
                    ratio: round2(paymentRatio),
                },
                suggestedAction: "Validate payments movement against expected collection cycles and follow-up plans.",
            }
            : null);
    }
    const highlights = [];
    if (invoicesCount > 0) {
        highlights.push(`Issued ${invoicesCount} invoices with total value ${round2(invoicesAmount)}.`);
    }
    if (paymentsCount > 0) {
        highlights.push(`Collected ${round2(paymentsAmount)} from ${paymentsCount} payments.`);
    }
    if (posOperationsCount > 0) {
        highlights.push(`POS team completed ${posOperationsCount} operations across ${employeeSummaries.length} active employees.`);
    }
    if (doneExchangeCount > 0) {
        highlights.push(`Completed ${doneExchangeCount} exchange requests today.`);
    }
    if (netCashFlow > 0) {
        highlights.push(`Net cash flow is positive at ${round2(netCashFlow)}.`);
    }
    if (pendingExchangeCount === 0) {
        highlights.push("No pending exchanges are waiting in queue.");
    }
    if (highlights.length === 0) {
        highlights.push("No notable positive highlights were detected for this date.");
    }
    const recommendedActions = Array.from(new Set(anomalies.map((anomaly) => anomaly.suggestedAction)));
    return {
        date: {
            dateKey,
            timezone: REPORT_TIMEZONE,
            generatedAt: new Date().toISOString(),
        },
        summary: {
            invoicesCount,
            invoicesAmount: round2(invoicesAmount),
            paymentsCount,
            paymentsAmount: round2(paymentsAmount),
            posOperationsCount,
            posOperationsAmount: round2(posOperationsAmount),
            supplierPurchaseAmount: round2(supplierPurchaseAmount),
            companyTopupAmount: round2(companyTopupAmount),
            wifiExpenseAmount: round2(wifiExpenseAmount),
            netCashFlow: round2(netCashFlow),
            doneExchangeCount,
            pendingExchangeCount,
        },
        completedToday: {
            invoices: {
                count: invoicesCount,
                amount: round2(invoicesAmount),
            },
            payments: {
                count: paymentsCount,
                amount: round2(paymentsAmount),
            },
            posWork: {
                operations: posOperationsCount,
                amount: round2(posOperationsAmount),
                employeesActive: employeeSummaries.length,
            },
            companyBalanceOps: {
                increaseCount,
                decreaseCount,
                fixCount,
            },
            doneExchanges: {
                count: doneExchangeCount,
            },
        },
        pendingNow: {
            pendingExchanges: {
                count: pendingExchangeCount,
                oldestHours: round2(oldestPendingHours),
            },
            debtSubscribers: {
                count: debtSubscribersCount,
                totalDebt: round2(debtTotalAmount),
            },
            lowBalanceCompanies: {
                warningCount: warningCompanies.length,
                criticalCount: criticalCompanies.length,
            },
        },
        anomalies,
        highlights: highlights.slice(0, 8),
        recommendedActions,
        supportingData: {
            topEmployeesToday: employeeSummaries.slice(0, rawLimit).map((item) => ({
                employee: item.employee,
                operations: item.operations,
                totalAmount: round2(item.totalAmount),
            })),
            lowOrOutCompanies: lowOrOutCompanies.slice(0, rawLimit).map((company) => (Object.assign(Object.assign({}, company), { balance: round2(company.balance), balanceLimit: round2(company.balanceLimit) }))),
            topDebtors: topDebtors.slice(0, rawLimit).map((subscriber) => (Object.assign(Object.assign({}, subscriber), { balance: round2(subscriber.balance), debtAmount: round2(subscriber.debtAmount) }))),
            recentPendingExchanges: pendingExchanges.slice(0, rawLimit),
            recentPortOperations: operationsLogsToday.slice(0, rawLimit),
            recentInquiryLogs: inquiryLogsToday.slice(0, rawLimit),
            posProfitToday: {
                count: posProfitTodayCount,
                totalAmount: round2(posProfitTodayAmount),
                totalProfitAmount: round2(posProfitTodayProfitAmount),
            },
        },
    };
});
exports.getTodayOverviewReport = getTodayOverviewReport;
