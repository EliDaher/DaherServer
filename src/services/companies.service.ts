const { ref, get, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");


class AppError extends Error {
  statusCode;

  constructor(message: any, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

type updateCompanyBalanceProp = {
  companyId: string;
  amount: number;
};

type updateCompanyBalanceOut = {
  beforeBalance: number;
  afterBalance: number;
  error?: any;
};

export const updateCompanyBalance = async ({
  companyId,
  amount,
}: updateCompanyBalanceProp): Promise<updateCompanyBalanceOut> => {
  try {
    const companiesRef = ref(database, `companies/${companyId}`);
    const snapshot = await get(companiesRef);
    if (!snapshot.exists()) {
      throw new AppError("Company not found", 404);
    }

    const companyData = snapshot.val();
    const currentBalance = companyData.balance || 0;
    const newBalance = currentBalance + amount;

    await set(companiesRef, {
      ...companyData,
      balance: newBalance,
      lastUpdate: new Date().toISOString(),
    });
    return { beforeBalance: currentBalance, afterBalance: newBalance };
  } catch (error) {
    console.error("updateCompanyBalance Error:", error);
    throw error; // 🔥 مهم جدًا
  }
};
