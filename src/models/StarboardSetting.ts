import { Schema, model } from "mongoose";

const StarboardSettingSchema = new Schema({
  threshold: { type: Number, default: 3 }
});

export default model("StarboardSetting", StarboardSettingSchema); 