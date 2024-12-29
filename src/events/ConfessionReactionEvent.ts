import { Events, MessageReaction, User, TextChannel, DMChannel } from "discord.js";
import ConfessionSetting from "../models/ConfessionSetting";
import Confession from "../models/Confession";

export default {
  name: Events.MessageReactionAdd,
  async execute(reaction: MessageReaction, user: User) {
    // Ignore bot's own reactions or partials that need to be fetched
    if (user.bot || reaction.partial) return;

    if (reaction.emoji.name === "🚩") {
      // Get the threshold from the database
      const confessionSetting = await ConfessionSetting.findOne();
      const threshold = confessionSetting?.threshold ?? 5;

      // Check if reaction count (including the bot’s) has reached the threshold
      if (reaction.count && reaction.count >= threshold) {
        const channel = reaction.message.channel;
        const confessionMessage = reaction.message;

        // Check if the channel is a TextChannel or DMChannel
        if (channel instanceof TextChannel || channel instanceof DMChannel) {
          // Delete the confession
          await confessionMessage.delete();

          // Mark the confession as deleted in the DB
          await Confession.findOneAndUpdate(
            { messageId: confessionMessage.id },
            {
              $set: {
                deletedAt: new Date(),
                deleteReason: "Reported threshold reached"
              }
            }
          );

          // Log the deletion
          await channel.send(
            "A confession was removed due to exceeding the report threshold."
          );
        }
      }
    }
  },
}; 