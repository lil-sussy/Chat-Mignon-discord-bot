import { Schema, model } from "mongoose";

const ConfessionSchema = new Schema({
  confessionId: { type: String, required: true },
  creatorHash: { type: String, required: true },
  // Example: store the actual confession text or logs
  content: { type: String, default: "" },
  messageId: { type: String },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
  deleteReason: { type: String }
});

export default model("Confession", ConfessionSchema); 