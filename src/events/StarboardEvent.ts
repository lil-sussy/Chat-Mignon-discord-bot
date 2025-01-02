import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  TextChannel,
  User,
  EmbedBuilder,
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

    if (reaction.message.partial) await reaction.message.fetch();

    let starboardDoc = await StarboardSetting.findOne({});
    if (!starboardDoc) {
      starboardDoc = await StarboardSetting.create({ threshold: 3 });
    }
    const threshold = starboardDoc.threshold;

    const starboardChannel = client.channels.cache.get(
      client.config.starboard.channelId
    ) as TextChannel;
    if (!starboardChannel) return;

    if (!reaction.count || reaction.count < threshold) return;

    const fetchedMsg = reaction.message;
    const originalId = fetchedMsg.id;
    const messageLink = `https://discord.com/channels/${fetchedMsg.guild?.id}/${fetchedMsg.channel.id}/${originalId}`;

    const recentMessages = await starboardChannel.messages.fetch({ limit: 50 });
    const existingStarboard = recentMessages.find((m) => {
      const [embed] = m.embeds;
      return embed?.footer?.text?.endsWith(originalId);
    });

    const mainContent =
      fetchedMsg.content || fetchedMsg.embeds[0]?.description || "no content";

    const embedBuilder = new EmbedBuilder()
      .setColor(0xffd700)
      .setAuthor({
        name: fetchedMsg.author?.tag ?? "Unknown author",
        iconURL: fetchedMsg.author?.displayAvatarURL() ?? "",
      })
      .setDescription(mainContent)
      .setFooter({
        text: `${client.config.starboard.emoji} ${reaction.count} | ${originalId}`,
      })
      .setTimestamp();

    embedBuilder.addFields({
      name: "Channel",
      value: `<#${fetchedMsg.channel.id}> [Original Message](${messageLink})`,
      inline: false,
    });

    for (const attach of fetchedMsg.attachments.values()) {
      if (attach.contentType?.startsWith("image/")) {
        embedBuilder.setImage(attach.url);
      } else if (attach.contentType?.startsWith("video/")) {
        embedBuilder.addFields({
          name: "Attached Video",
          value: `[Video Link](${attach.url})`,
          inline: false,
        });
      }
    }

    if (existingStarboard) {
      await existingStarboard.edit({ embeds: [embedBuilder] });
    } else {
      await starboardChannel.send({ embeds: [embedBuilder] });
    }
  },
};

export default StarboardEvent; 