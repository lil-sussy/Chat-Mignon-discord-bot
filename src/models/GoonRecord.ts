import { Schema, model, Document } from "mongoose";

interface IGoonRecord extends Document {
  discordId: string;
  lastDate: Date;
  chastityStartDate?: Date;
  chastityTheoryEndDate?: Date;
}

const GoonRecordSchema = new Schema<IGoonRecord>({
  discordId: { type: String, required: true, unique: true },
  lastDate: { type: Date, required: true },
  chastityStartDate: { type: Date },
  chastityTheoryEndDate: { type: Date },
});

export default model<IGoonRecord>("GoonRecord", GoonRecordSchema); 