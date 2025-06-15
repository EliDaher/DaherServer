import { Request, Response } from "express";
const {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const dbRef = ref(database, "user");
    const searchQuery = query(
      dbRef,
      orderByChild("username"),
      equalTo(username)
    );

    const snapshot = await get(searchQuery);

    // التحقق مما إذا كان المستخدم موجودًا
    if (!snapshot.exists()) {
      return res.status(401).json({ error: "User not found" });
    }

    const data = snapshot.val();
    const usersList = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));

    // التحقق من كلمة المرور
    const user = usersList.find((user) => user.password === password);
    if (!user) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({ message: "Login successful", user });
  } catch (error) {
    console.error("Error Firebase Login: ", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
};

export const register = (req: Request, res: Response) => {
  return res.status(201).json({ message: "User registered" });
};
