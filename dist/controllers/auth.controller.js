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
exports.register = exports.login = void 0;
const { ref, get, query, orderByChild, equalTo, } = require("firebase/database");
const { database } = require("../../firebaseConfig.js");
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        const dbRef = ref(database, "user");
        const searchQuery = query(dbRef, orderByChild("username"), equalTo(username));
        const snapshot = yield get(searchQuery);
        // التحقق مما إذا كان المستخدم موجودًا
        if (!snapshot.exists()) {
            return res.status(401).json({ error: "User not found" });
        }
        const data = snapshot.val();
        const usersList = Object.keys(data).map((key) => (Object.assign({ id: key }, data[key])));
        // التحقق من كلمة المرور
        const user = usersList.find((user) => user.password === password);
        if (!user) {
            return res.status(401).json({ error: "Invalid password" });
        }
        res.json({ message: "Login successful", user });
    }
    catch (error) {
        console.error("Error Firebase Login: ", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});
exports.login = login;
const register = (req, res) => {
    return res.status(201).json({ message: "User registered" });
};
exports.register = register;
