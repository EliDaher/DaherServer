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
exports.updateCompanyBalance = void 0;
const { ref, get, set } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}
const updateCompanyBalance = (_a) => __awaiter(void 0, [_a], void 0, function* ({ companyId, amount, }) {
    try {
        const companiesRef = ref(database, `companies/${companyId}`);
        const snapshot = yield get(companiesRef);
        if (!snapshot.exists()) {
            throw new AppError("Company not found", 404);
        }
        const companyData = snapshot.val();
        const currentBalance = companyData.balance || 0;
        const newBalance = currentBalance + amount;
        yield set(companiesRef, Object.assign(Object.assign({}, companyData), { balance: newBalance, lastUpdate: new Date().toISOString() }));
        return { beforeBalance: currentBalance, afterBalance: newBalance };
    }
    catch (error) {
        console.error("updateCompanyBalance Error:", error);
        throw error; // 🔥 مهم جدًا
    }
});
exports.updateCompanyBalance = updateCompanyBalance;
