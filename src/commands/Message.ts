import { ChatInputCommandInteraction, Role, SlashCommandBuilder, TextChannel, NewsChannel } from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces";

const command: ChatInputCommand = {
	options: new SlashCommandBuilder()
		.setName("update")
		.setDescription("Post a message in the current channel.")
		.addStringOption((option) => option.setName("message").setDescription("The message to post.").setRequired(true)),
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
