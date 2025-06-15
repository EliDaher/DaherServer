import { Request, Response } from "express";
const {
  ref,
  get,
  child
} = require("firebase/database");
const { database } = require("../../firebaseConfig.js");

export const getCustomers = async (req: Request, res: Response) => {

    try {

        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'Subscribers')); 
        if (snapshot.exists()) {
            const data = snapshot.val();
            const usersList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            res.status(200).json({ success: true, customers: usersList });
        } else {
            console.log("No data available");
            res.status(401).json({ error: "Failed to fetch data" });
        }
    
    } catch (error) {
        console.error("Error Firebase Login: ", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

