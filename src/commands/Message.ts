import { ChatInputCommandInteraction, Role, SlashCommandBuilder, TextChannel, NewsChannel } from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces";
import { hasModPermission } from "../features/HasModPermissions";
import { buildMessage } from "../features/buildMessage";
import { GuildMember } from "discord.js";

const command: ChatInputCommand = {
	options: new SlashCommandBuilder()
		.setName("message")
		.setDescription("Post a message in the current channel.")
		.addStringOption((option) => option.setName("message").setDescription("The message to post.").setRequired(true)),
	global: false, // Ensure this is false for guild commands

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		// Check if the user has the moderator role
		const hasPermission = await hasModPermission(client, interaction);
		if (!hasPermission) return;
    const interactionMember = interaction.member instanceof GuildMember ? interaction.member : undefined;

		// Get the message content
		const message = interaction.options.getString("message", true);

		// Replace every \cat\ with a random cat emoji
		const updatedMessage = buildMessage(interaction.guild!, client, interactionMember, message, client.config.catEmojis);

		// Ensure the channel is a TextChannel or NewsChannel before sending the message
		if (interaction.channel instanceof TextChannel || interaction.channel instanceof NewsChannel) {
			await interaction.channel.send(updatedMessage);
			await interaction.reply({
				content: "Your message has been posted in this channel!",
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: "This command can only be used in text-based channels.",
				ephemeral: true,
			});
		}
	},
};

export default command;
