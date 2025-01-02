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
    if (reaction.emoji.name !== client.config.starboard.emoji) return;

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

      // Create a link to the original message
      const messageLink = `https://discord.com/channels/${fetchedMsg.guild?.id}/${fetchedMsg.channel.id}/${fetchedMsg.id}`;

      // Figure out text content (bot embed fallback)
      const mainContent =
        fetchedMsg.content
        || (fetchedMsg.embeds[0]?.description || "no content");

      // Build base embed
      const embed = {
        color: 0xffd700,
        author: {
          name: fetchedMsg.author?.tag ?? "Unknown author",
          icon_url: fetchedMsg.author?.displayAvatarURL() ?? "",
        },
        description: mainContent,
        footer: {
          text: `${client.config.starboard.emoji} ${reaction.count} | ${fetchedMsg.id}`
        },
        fields: [
          {
            name: "Channel",
            value: `<#${fetchedMsg.channel.id}> [Original Message](${messageLink})`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      } as any; // Cast to "any" to avoid strict type issues with optional fields.

      // Process attachments
      for (const attach of fetchedMsg.attachments.values()) {
        if (attach.contentType?.startsWith("image/")) {
          // Embed the first image
          embed.image = { url: attach.url };
        } else if (attach.contentType?.startsWith("video/")) {
          // Provide a link to the video
          embed.fields.push({
            name: "Attached Video",
            value: `[Video Link](${attach.url})`,
            inline: false,
          });
        }
        // If it's a linked embed (e.g., YouTube), do nothing special—it's already in mainContent.
      }

      await starboardChannel.send({ embeds: [embed] });
    }
  },
};

export default StarboardEvent; 