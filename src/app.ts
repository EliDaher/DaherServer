import express from "express";
import cors from "cors";
import routes from "./routes";
import morgan from "morgan";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

app.use("*", (req, res) => {
  res.status(404).json({ message: "🚫 Route not found" });
});

export default app;
