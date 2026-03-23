const { ref, push, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

type createBalanceLogProp = {
  type: "fix" | "increase" | "decrease";
  amount: number;
  reason: string;
  company: string;
  number: number;
  port: string;
  beforeBalance: number;
  afterBalance: number;
};

type createBalanceLogOut = {
  id: string;
  date: string;
};

export const createBalanceLog = async (
  logProps: createBalanceLogProp,
): Promise<createBalanceLogOut> => {
  try {
    const now = new Date().toISOString();
    const date = now.split("T")[0];

    const balanceLogsRef = ref(database, `balanceLogs/${date}`);
    const newLogRef = push(balanceLogsRef);

    await set(newLogRef, {
      ...logProps,
      date: now,
    });

    return {
      id: newLogRef.key as string,
      date: now,
    };
  } catch (error) {
    console.error("createBalanceLog error:", error);
    throw new AppError("Failed to create balance log", 500);
  }
};
