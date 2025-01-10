import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces/Command";
import { createTicketChannel } from "../utils/ChannelCreator"; // NEW IMPORT

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
    const userReporter = interaction.user;
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

    // Instead of manually creating the channel & collector, call createTicketChannel:
    await createTicketChannel({
			client: client,
			guild: guild,
			channelNames: [`report-${interaction.user.username}-${reportedUser.username}`, `report-${reportedUser.username}`],
			categoryName: client.config.moderationCategoryName,
			whoCanDelete: "mods",
			hasSecondButton: true,
			userIds: [interaction.user.id, reportedUser.id],
			content: `@${client.config.moderatorRoleName}, please look into this report!\n` + `• Reporter: ${interaction.user}\n` + `• Reported user: ${reportedUser}\n` + `• Description: ${description}`,
		});

    // Acknowledge the reporter
    await interaction.reply({
      content: "Your report has been submitted. Moderators will respond soon!",
      ephemeral: true,
    });
  },
} as ChatInputCommand; 