import { Schema, model, Document } from "mongoose";

interface IConfessionSetting extends Document {
  channelId: string;
  threshold: number;
  colorIndex: number;
}

const ConfessionSettingSchema = new Schema<IConfessionSetting>({
  channelId: { type: String, required: true },
  threshold: { type: Number, default: 5 },
  colorIndex: { type: Number, default: 0 },
});

ConfessionSettingSchema.index({ channelId: 1 }, { unique: true });

export default model<IConfessionSetting>("ConfessionSetting", ConfessionSettingSchema); 