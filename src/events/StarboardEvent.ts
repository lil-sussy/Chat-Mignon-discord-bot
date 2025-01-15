import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  TextChannel,
  User,
  EmbedBuilder,
  GuildMember,
  Message
} from "discord.js";
import { Event } from "../interfaces/Event";
import ExtendedClient from "../classes/Client";
import StarboardSetting from "../models/StarboardSetting";

export const buildStarboardEmbed = (
  fetchedMsg: Message,
  userDisplayName: string,
  reactionCount: number,
  originalId: string,
  messageLink: string,
  replyContent?: string
) => {
  const mainContent =
    fetchedMsg.content || fetchedMsg.embeds[0]?.description || "no content";

  const embedBuilder = new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor({
      name: userDisplayName ?? "Unknown author",
      iconURL: fetchedMsg.author?.displayAvatarURL() ?? "",
    })
    .setDescription(mainContent)
    .setFooter({
      text: `${reactionCount} | ${originalId}`,
    })
    .setTimestamp();

  embedBuilder.addFields({
    name: "Channel",
    value: `<#${fetchedMsg.channel.id}> [Original Message](${messageLink})`,
    inline: false,
  });

  if (replyContent) {
    embedBuilder.addFields({
      name: "Replying to",
      value: replyContent,
      inline: false,
    });
  }

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

  return embedBuilder;
};

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

    const fetchedMsg = reaction.message as Message;
    const originalId = fetchedMsg.id;
    const messageLink = `https://discord.com/channels/${fetchedMsg.guild?.id}/${fetchedMsg.channel.id}/${originalId}`;
    const member = user instanceof GuildMember ? user : reaction.message.member as GuildMember;
    const userDisplayName = member?.nickname || reaction.message.member?.user.globalName || reaction.message.member?.user.username;

    let replyContent;
    if (fetchedMsg.reference?.messageId) {
      try {
        const repliedToMsg = await fetchedMsg.channel.messages.fetch(fetchedMsg.reference.messageId);
        replyContent = repliedToMsg.content || "no content";
      } catch {
        replyContent = "Could not fetch the replied message.";
      }
    }

    const recentMessages = await starboardChannel.messages.fetch({ limit: 50 });
    const existingStarboard = recentMessages.find((m) => {
      const [embed] = m.embeds;
      return embed?.footer?.text?.endsWith(originalId);
    });

    const embedBuilder = buildStarboardEmbed(
      fetchedMsg,
      userDisplayName ?? "Unknown author",
      reaction.count,
      originalId,
      messageLink,
      replyContent
    );

    if (existingStarboard) {
      await existingStarboard.edit({ embeds: [embedBuilder] });
    } else {
      await starboardChannel.send({ embeds: [embedBuilder] });
    }
  },
};

export default StarboardEvent; 