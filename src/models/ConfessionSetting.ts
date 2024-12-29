import { Schema, model } from "mongoose";

const ConfessionSettingSchema = new Schema({
  threshold: { type: Number, default: 5 }
});

export default model("ConfessionSetting", ConfessionSettingSchema); 