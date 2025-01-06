import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import { createTicketChannel } from "../utils/ChannelCreator";

const TicketCommand: ChatInputCommand = {
  options: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a ticket for specified users")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a ticket for specified users")
        .addStringOption((option) =>
          option
            .setName("user_ids")
            .setDescription("Comma-separated list of user IDs")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a user to the current ticket channel")
        .addStringOption((option) =>
          option
            .setName("user_id")
            .setDescription("User ID to add to the ticket")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Only mods can use this
  global: true,
  async execute(client, interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
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
    } else if (subcommand === "add") {
      const userId = interaction.options.getString("user_id", true);
      const channel = interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "This command can only be used in a text channel.",
          ephemeral: true,
        });
        return;
      }

      try {
        await channel.permissionOverwrites.create(userId, {
          ViewChannel: true,
          SendMessages: true,
        });

        await interaction.reply({
          content: `User <@${userId}> has been added to the ticket channel.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error("Error adding user to ticket channel:", error);
        await interaction.reply({
          content: "Failed to add user to the ticket channel.",
          ephemeral: true,
        });
      }
    }
  },
};

export default TicketCommand; 