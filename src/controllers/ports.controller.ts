import { Request, Response } from "express";
import { runTransaction } from "firebase/database";
import { emitToUser } from "../sockets/socketHandler";
const {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
  update,
  push,
  set,
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const addPortOprationInternal = async ({
  executorName,
  operationType,
  note,
}: {
  executorName: string;
  operationType:
    | "CustomerInvoice"
    | "POSInvoice"
    | "WiFiInvoice"
    | "CompanyIncrease";
  note: string;
}) => {

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

    const operationLogsRef = ref(
      database,
      `operationsLogs/${date}`
    );

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
