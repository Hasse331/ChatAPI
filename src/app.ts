import express from "express";
import cors from "cors";
import connectDB from "./config/db";
import morgan from "morgan";
import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import Joi from "joi";
import rateLimite from "express-rate-limit";

require("dotenv").config();

// Middlewares etc
const chatSchema = Joi.object({
  message: Joi.string().required(),
  senderId: Joi.string().required(),
  reciverId: Joi.string().required(),
});

const limiter = rateLimite({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(limiter);

connectDB();

// Routes
app.post("/chats", async (req, res, next) => {
  const { error } = chatSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details);
  }
  next();
});
app.get("/chats", async (req, res) => {
  // Logic
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.status, err.stack, err.message);
  res.status(500).send("Something go wrong!");
  next(err);
});

export default app;
