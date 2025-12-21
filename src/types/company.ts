export interface Company {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
  lastUpdate: string;
  balanceLimit: number;
}

export interface BalanceLog {
    type: "decrease";
    amount: number;
    reason: string;
    company: Company;
    companyId: string;
    number: string;
    port: string;
    beforeBalance: number;
    afterBalance: number;
    date: string;
}