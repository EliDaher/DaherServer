import { runTransaction } from "firebase/database";
import { emitToUser } from "../sockets/socketHandler";

const { ref, get, query, orderByChild, equalTo, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export type AddPortOperationParams = {
  executorName: string;
  operationType:
    | "CustomerInvoice"
    | "POSInvoice"
    | "WiFiInvoice"
    | "FixBalance"
    | "CompanyIncrease";
  note: string;
};

export type GetPortsOperationsParams = {
  fromDate?: string;
  toDate?: string;
  executorName?: string;
};

export const addPortOperation = async ({
  executorName,
  operationType,
  note,
}: AddPortOperationParams) => {
  try {
    const date = new Date().toISOString().split("T")[0];

    const dbRef = ref(database, "user");

    const searchQuery = query(
      dbRef,
      orderByChild("username"),
      equalTo(executorName)
    );

    const snapshot = await get(searchQuery);

    if (!snapshot.exists()) {
      return { error: "User not found" };
    }

    const userId = Object.keys(snapshot.val())[0];
    const userOperationsRef = ref(
      database,
      `user/${userId}/operationsCount/${operationType}`
    );

    await runTransaction(userOperationsRef, (currentValue) => {
      return (currentValue || 0) + 1;
    });

    const portLogData = {
      executorName,
      operationType,
      note: note || "",
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
    };

    const operationLogsRef = ref(database, `operationsLogs/${date}`);
    const newLogRef = await push(operationLogsRef);
    await set(newLogRef, portLogData);

    try {
      emitToUser("reactUser", "sendPortLog", portLogData);
    } catch (e) {
      console.warn("Socket emit failed, continuing...", e);
    }

    return { message: "Operation count updated safely" };
  } catch (error) {
    console.error("Firebase Transaction Error:", error);
    return { error: "Failed to update operation count" };
  }
};

export const getportsOperations = async ({
  fromDate,
  toDate,
  executorName,
}: GetPortsOperationsParams = {}) => {
  try {
    const operationLogsRef = ref(database, "operationsLogs");
    const snapshot = await get(operationLogsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const logs = snapshot.val();
    const result: any[] = [];

    Object.keys(logs).forEach((dateKey) => {
      const isAfterFromDate = !fromDate || dateKey >= fromDate;
      const isBeforeToDate = !toDate || dateKey <= toDate;

      if (!isAfterFromDate || !isBeforeToDate) {
        return;
      }

      const dayLogs = logs[dateKey] || {};

      Object.keys(dayLogs).forEach((logId) => {
        const log = dayLogs[logId];

        if (executorName && log.executorName !== executorName) {
          return;
        }

        result.push({
          id: logId,
          dateKey,
          ...log,
        });
      });
    });

    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return result;
  } catch (error) {
    console.error("getportsOperations error:", error);
    throw new Error("Failed to fetch ports operations");
  }
};
