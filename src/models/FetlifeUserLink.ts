import { Schema, model, Document } from "mongoose";

interface IUserLink extends Document {
  discordId: string;
  fetlifeUsername: string;
  fetlifeID: string;
}

const UserLinkSchema = new Schema<IUserLink>({
  discordId: { type: String, required: true, unique: true },
  fetlifeUsername: { type: String, required: true },
  fetlifeID: { type: String, required: false },
});

export default model<IUserLink>("FetlifeUserLink", UserLinkSchema); 