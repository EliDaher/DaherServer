import { Request, Response } from "express";
import { generateToken } from "../utils/jwt";

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    const token = generateToken({ username });
    return res.json({ success: true, token });
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
};

export const register = (req: Request, res: Response) => {
  return res.status(201).json({ message: "User registered" });
};
