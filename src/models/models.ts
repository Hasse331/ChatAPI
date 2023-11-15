import mongoose from "mongoose";

const clientService = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

const userMessages = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  client_id: { type: String, required: true },
  chat_id: { type: String, required: true },
  sender_id: { type: String, required: true },
  reciver_id: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
