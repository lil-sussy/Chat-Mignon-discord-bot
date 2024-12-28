import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces/Command";

export default {
  options: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report a user to the moderators.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to report")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the issue")
        .setRequired(true),
    ),
  global: false, // Ensure this is false for guild commands
  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
    const reportedUser = interaction.options.getUser("user", true);
    const description = interaction.options.getString("description", true);
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "This command cannot be used in DMs.",
        ephemeral: true,
      });
      return;
    }

    // Create ticket channel for the report
    const channelName = `report-${interaction.user.username}-${reportedUser.username}`;
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: client.config.moderatorCategoryId, // Ensure config.json has "moderatorCategoryId"
      permissionOverwrites: [
        // Allow reporter to view the channel
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        // Allow reported user to see the channel if you wish
        {
          id: reportedUser.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        // Deny @everyone from seeing it
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    // Let moderators know
    await ticketChannel.send(
      `Moderators, please look into this report!\n` +
      `• Reporter: ${interaction.user}\n` +
      `• Reported user: ${reportedUser}\n` +
      `• Description: ${description}`,
    );

    // Acknowledge the reporter
    await interaction.reply({
      content: `Your report has been submitted. Moderators will respond soon!`,
      ephemeral: true,
    });
  },
} as ChatInputCommand; 