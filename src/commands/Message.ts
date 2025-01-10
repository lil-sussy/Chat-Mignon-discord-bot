import { ChatInputCommandInteraction, Role, SlashCommandBuilder, TextChannel, NewsChannel } from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces";
import { hasModPermission } from "../features/HasModPermissions";

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

		// Get the message content
		const message = interaction.options.getString("message", true);

		// Replace every \cat\ with a random cat emoji
		const pattern = /\\cat\\/g;
		const updatedMessage = message.replace(pattern, () => {
			return client.config.catEmojis[Math.floor(Math.random() * client.config.catEmojis.length)];
		});

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
