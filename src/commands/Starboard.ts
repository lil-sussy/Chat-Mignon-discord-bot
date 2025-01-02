import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  Role
} from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import ExtendedClient from "../classes/Client";
import StarboardSetting from "../models/StarboardSetting";

// ... existing imports (if any) ...

const StarboardCommand: ChatInputCommand = {
  options: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Configure or view starboard settings")
    .addSubcommand(sub =>
      sub
        .setName("setchannel")
        .setDescription("Set the starboard channel")
        .addChannelOption(opt =>
          opt
            .setName("channel")
            .setDescription("Text channel to set as the starboard")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("setthreshold")
        .setDescription("Set the star threshold required for a message to be starred")
        .addIntegerOption(opt =>
          opt
            .setName("threshold")
            .setDescription("Number of stars required")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View current starboard settings")
    )
    .addSubcommand(sub =>
      sub
        .setName("refresh")
        .setDescription("Refresh a starboard message using its starboard message ID")
        .addStringOption(opt =>
          opt
            .setName("starboard_message_id")
            .setDescription("The ID of the starboard message to refresh")
            .setRequired(true)
        )
    ) as SlashCommandBuilder,

  global: false, // Ensure this is false for guild commands

  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    // Check if the user has the moderator role
    const roleName = client.config.moderatorRoleName;
    const moderatorRole: Role | undefined = interaction.guild?.roles.cache.find((r) => r.name === roleName);

    if (!moderatorRole) {
      await interaction.reply({
        content: `Moderator role "${roleName}" not found in this server.`,
        ephemeral: true,
      });
      return;
    }

    // @ts-expect-error "roles" type on member can be narrower but typically includes "cache"
    const memberRoles = interaction.member?.roles?.cache;
    if (!memberRoles || !memberRoles.has(moderatorRole.id)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    // Defer the reply to give more time for processing
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "setchannel": {
        const channel = interaction.options.getChannel("channel", true);
        if (channel.type !== 0) { // 0 => TextChannel in discord.js v14
          await interaction.editReply({
            content: "Please select a valid text channel.",
          });
          return;
        }

        // Update config in-memory and possibly persist to file
        client.config.starboard.channelId = channel.id;

        const embed = {
          title: "Starboard Channel Updated",
          description: `Starboard channel set to <#${channel.id}>`,
          color: 0x2f3136, // example color
        };
        await interaction.editReply({ embeds: [embed] });
        break;
      }
      case "setthreshold": {
        const threshold = interaction.options.getInteger("threshold", true);
        // Save threshold to Mongo
        await StarboardSetting.findOneAndUpdate(
          {},
          { threshold },
          { upsert: true, new: true }
        );
        await interaction.editReply({
          content: `Star threshold set to **${threshold}**.`,
        });
        break;
      }
      case "view": {
        // Get threshold from Mongo
        const doc = await StarboardSetting.findOne({});
        const threshold = doc?.threshold ?? 0;
        const channelId = client.config.starboard.channelId; // Channel still in config, or also store in DB if desired

        const embed = {
          title: "Starboard Settings",
          description: `● **Channel**: <#${channelId || "Not set"}>\n● **Threshold**: ${threshold}`,
          color: 0x2f3136,
        };
        await interaction.editReply({ embeds: [embed] });
        break;
      }
      case "refresh": {
        const starboardMessageId = interaction.options.getString("starboard_message_id", true);
        const starboardChannel = client.channels.cache.get(client.config.starboard.channelId) as TextChannel;
        if (!starboardChannel) {
          await interaction.editReply({ content: "Starboard channel not found." });
          return;
        }

        try {
          // Fetch the starboard message
          const starMsg = await starboardChannel.messages.fetch(starboardMessageId);
          if (!starMsg.embeds.length) {
            await interaction.editReply({ content: "No embed found on that starboard message." });
            return;
          }

          // Original message ID may be in an embed footer like: "🗿 3 | 123456789012345678"
          const footerText = starMsg.embeds[0].footer?.text || "";
          const originalIdMatch = footerText.match(/\|\s*(\d{17,})$/);
          if (!originalIdMatch) {
            await interaction.editReply({ content: "Could not locate the original message ID." });
            return;
          }

          const originalMsgId = originalIdMatch[1];
          const allChannels = interaction.guild?.channels.cache.filter((c) => c.isTextBased());
          let foundMessage;
          for (const c of allChannels?.values() || []) {
            try {
              const chan = c as TextChannel;
              foundMessage = await chan.messages.fetch(originalMsgId);
              if (foundMessage) {
                break;
              }
            } catch {
              // Not in this channel or no permissions
            }
          }
          if (!foundMessage) {
            await interaction.editReply({ content: "Could not fetch the original message." });
            return;
          }

          // Check if the message is from a bot
          const isBotMessage = foundMessage.author?.bot;
          let messageContent = foundMessage.content || "no content";

          // If it's a bot message, try to get content from the embed
          if (isBotMessage && foundMessage.embeds.length > 0) {
            messageContent = foundMessage.embeds[0].description || "no content";
          }

          // Update the embed with fresh content, including channel info
          const updatedEmbed = {
            color: 0xffd700,
            author: {
              name: foundMessage.author?.tag || "Unknown author",
              icon_url: foundMessage.author?.displayAvatarURL() || "",
            },
            description: messageContent,
            footer: {
              text: `${client.config.starboard.emoji} ${reactionCount(foundMessage, client.config.starboard.emoji)} | ${foundMessage.id}`,
            },
            fields: [
              {
                name: "Channel",
                value: `<#${foundMessage.channel.id}>`,
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          };

          // Edit the existing starboard message
          await starMsg.edit({ embeds: [updatedEmbed] });
          await interaction.editReply({ content: "Starboard message refreshed." });
        } catch (error) {
          console.error(error);
          await interaction.editReply({ content: "An error occurred refreshing the starboard message." });
        }
        break;
      }
    }
  }
};

// Helper function to count the specific emoji
function reactionCount(msg: any, targetEmoji: string): number {
  const reaction = msg.reactions?.cache?.find((r: any) => r.emoji.name === targetEmoji);
  return reaction?.count || 0;
}

export default StarboardCommand; 