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
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to create a ticket for")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a user to the current ticket channel")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add to the ticket")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Only mods can use this
  global: false,
  async execute(client, interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const user = interaction.options.getUser("user", true);
      const userIds = [user.id];

      try {
        await createTicketChannel({
					client,
					guild: interaction.guild!,
					channelNames: [`ticket-${interaction.user.username}-${user.username}`, `ticket-${user.username}`],
					categoryName: client.config.moderationCategoryName, // Ensure this category exists
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
      const user = interaction.options.getUser("user", true);
      const channel = interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "This command can only be used in a text channel.",
          ephemeral: true,
        });
        return;
      }

      try {
        await channel.permissionOverwrites.create(user.id, {
          ViewChannel: true,
        });

        await interaction.reply({
          content: `User <@${user.id}> has been added to the ticket channel.`,
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