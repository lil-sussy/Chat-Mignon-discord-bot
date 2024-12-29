import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  TextChannel,
  User
} from "discord.js";
import { Event } from "../interfaces/Event";
import ExtendedClient from "../classes/Client";
import StarboardSetting from "../models/StarboardSetting";

const StarboardEvent: Event = {
  name: "messageReactionAdd",
  once: false,
  async execute(
    client: ExtendedClient,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (reaction.emoji.name !== "⭐") return;

    // Ensure the message is fetched if partial
    if (reaction.message.partial) await reaction.message.fetch();

    // Check for existing starboard settings
    let starboardDoc = await StarboardSetting.findOne({});
    if (!starboardDoc) {
        // Create a new document with a default threshold of 3
        starboardDoc = await StarboardSetting.create({ threshold: 3 });
    }
    const { threshold } = starboardDoc;

    // If reaction count meets or exceeds threshold, post/update in starboard channel
    if (reaction.count && reaction.count >= threshold) {
      const starboardChannel = client.channels.cache.get(client.config.starboard.channelId) as TextChannel;
      if (!starboardChannel) return;

      const fetchedMsg = reaction.message;
      // Construct starboard embed or content
      const embed = {
        color: 0xffd700,
        author: {
          name: fetchedMsg.author?.tag ?? "Unknown author",
          icon_url: fetchedMsg.author?.displayAvatarURL() ?? "",
        },
        description: fetchedMsg.content ?? "no content",
        footer: { text: `⭐ ${reaction.count} | ${fetchedMsg.id}` },
        timestamp: new Date().toISOString(),
      };

      await starboardChannel.send({ embeds: [embed] });
    }
  },
};

export default StarboardEvent; 