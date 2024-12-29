import { Schema, model, Document } from "mongoose";

interface IConfession extends Document {
  messageId: string;
  content: string;
  deletedAt?: Date;
  deleteReason?: string;
  channelId: string;
}

const ConfessionSchema = new Schema<IConfession>({
  messageId: { type: String, required: true },
  content: { type: String, required: true },
  deletedAt: { type: Date },
  deleteReason: { type: String },
  channelId: { type: String, required: true },
});

export default model<IConfession>("Confession", ConfessionSchema); 