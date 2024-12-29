import { Schema, model } from "mongoose";

const ConfessionSchema = new Schema({
  confessionId: { type: String, required: true },
  creatorHash: { type: String, required: true },
  // Example: store the actual confession text or logs
  content: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

export default model("Confession", ConfessionSchema); 