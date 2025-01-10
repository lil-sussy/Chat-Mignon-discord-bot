import { Schema, model, Document } from "mongoose";

interface IGoonRecord extends Document {
  discordId: string;
  lastDate: Date;
}

const GoonRecordSchema = new Schema<IGoonRecord>({
  discordId: { type: String, required: true, unique: true },
  lastDate: { type: Date, required: true },
});

export default model<IGoonRecord>("GoonRecord", GoonRecordSchema); 