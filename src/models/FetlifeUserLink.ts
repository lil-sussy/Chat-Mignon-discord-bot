import { Schema, model, Document } from "mongoose";

interface IUserLink extends Document {
  discordId: string;
  fetlifeUsername: string;
}

const UserLinkSchema = new Schema<IUserLink>({
  discordId: { type: String, required: true, unique: true },
  fetlifeUsername: { type: String, required: true },
});

export default model<IUserLink>("FetlifeUserLink", UserLinkSchema); 