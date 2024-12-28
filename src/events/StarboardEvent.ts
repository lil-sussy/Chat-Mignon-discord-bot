import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  TextChannel,
  User
} from "discord.js";
import { Event } from "../interfaces/Event";
import ExtendedClient from "../classes/Client";

const StarboardEvent: Event = {
  name: "messageReactionAdd",
  once: false,
  async execute(
    client: ExtendedClient,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    console.log("Starboard event triggered:", reaction, user);
    // If it's not a star (⭐), ignore
    console.log(reaction);
    if (reaction.emoji.name !== "⭐") return;

    // Ensure the message is fetched if partial
    if (reaction.message.partial) await reaction.message.fetch();

    const { channelId, threshold } = client.config.starboard;
    if (!channelId || !threshold) return;

    // If reaction count meets or exceeds threshold, post/update in starboard channel
    if (reaction.count && reaction.count >= threshold) {
      const starboardChannel = client.channels.cache.get(channelId) as TextChannel;
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