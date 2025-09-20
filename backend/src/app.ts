import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.routes";

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:4200",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

export default app;
