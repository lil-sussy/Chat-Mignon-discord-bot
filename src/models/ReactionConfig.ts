import { model, Schema } from "mongoose";

/**
 * Each document represents a specific reaction feature setting, e.g.,
 * { reactionName: 'feur', enabled: true }
 */
const ReactionConfigSchema = new Schema({
    reactionName: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        required: true
    }
});

export default model("ReactionConfig", ReactionConfigSchema); 