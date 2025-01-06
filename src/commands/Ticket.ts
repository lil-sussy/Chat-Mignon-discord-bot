import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import { createTicketChannel } from "../utils/ChannelCreator";

const TicketCommand: ChatInputCommand = {
  options: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a ticket for specified users")
    .addStringOption((option) =>
      option
        .setName("user_ids")
        .setDescription("Comma-separated list of user IDs")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Only mods can use this
  global: true,
  async execute(client, interaction: ChatInputCommandInteraction) {
    const userIdsString = interaction.options.getString("user_ids", true);
    const userIds = userIdsString.split(",").map((id) => id.trim());

    try {
      await createTicketChannel({
        client,
        guild: interaction.guild!,
        channelNames: [`ticket-${interaction.user.username}-${userIds[0]}`, `ticket-${userIds[0]}`],
        categoryName: "Tickets", // Ensure this category exists
        whoCanDelete: "mods",
        hasSecondButton: false,
        userIds,
        content: "This is a ticket channel.",
      });

      await interaction.reply({
        content: "Ticket channel created successfully.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error creating ticket channel:", error);
      await interaction.reply({
        content: "Failed to create ticket channel.",
        ephemeral: true,
      });
    }
  },
};

export default TicketCommand; 