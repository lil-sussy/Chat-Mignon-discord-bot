import { Schema, model } from "mongoose";

const StarboardSettingSchema = new Schema({
  threshold: { type: Number, default: 1 }
});

export default model("StarboardSetting", StarboardSettingSchema); 