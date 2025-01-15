/*
Refactor this code to make it respects ISO standards and clean architecthure standards. 
It is imperative that you repect the neat logic already implemented. You should value moving code in seperate functions / commenting code over deleting logic
*/

import { ChatInputCommandInteraction, Role, SlashCommandBuilder, TextChannel, NewsChannel, ForumChannel, ThreadChannel, GuildMember, AttachmentBuilder } from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces";
import { hasModPermission } from "../features/HasModPermissions";
import { buildMessage } from "../features/buildMessage";

const command: ChatInputCommand = {
	options: new SlashCommandBuilder()
		.setName("message")
		.setDescription("Post a message in the current channel.")
		.addStringOption((option) =>
			option
				.setName("message")
				.setDescription("The message to post.")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("message_link")
				.setDescription("Link to a text file containing the message.")
				.setRequired(false)
		),
	global: false, // Ensure this is false for guild commands

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		// Check if the user has the moderator role
		const hasPermission = await hasModPermission(client, interaction);
		if (!hasPermission) return;

		const interactionMember = interaction.member instanceof GuildMember ? interaction.member : undefined;
		const message = interaction.options.getString("message");
		const messageLink = interaction.options.getString("message_link");

		if (!message && !messageLink) {
			await interaction.reply({
				content: "You must provide either a message or a message link.",
				ephemeral: true,
			});
			return;
		}

		try {
			const finalMessages = await getFinalMessages(client, interaction, interactionMember, message, messageLink);
			await postMessages(interaction, finalMessages);
		} catch (error) {
			console.error("Error processing message command:", error);
			await interaction.reply({
				content: "There was an error processing your request.",
				ephemeral: true,
			});
		}
	},
};

/**
 * Retrieves the final messages to be posted based on the input options.
 */
async function getFinalMessages(client: ExtendedClient, interaction: ChatInputCommandInteraction, interactionMember: GuildMember | undefined, message: string | null, messageLink: string | null): Promise<string[]> {
	if (message) {
		// Replace every \cat\ with a random cat emoji
		return buildMessage(
			interaction.guild!,
			client,
			interactionMember,
			message,
			client.config.catEmojis
		);
	} else if (messageLink) {
		return await fetchMessageFromLink(client, interaction, interactionMember, messageLink);
	}
	return [];
}

/**
 * Fetches and processes a message from a provided link.
 */
async function fetchMessageFromLink(client: ExtendedClient, interaction: ChatInputCommandInteraction, interactionMember: GuildMember | undefined, messageLink: string): Promise<string[]> {
	const messageId = extractMessageId(messageLink);
	const channel = interaction.channel as TextChannel | NewsChannel | ForumChannel | ThreadChannel;
	if (!channel) {
		throw new Error("Cannot determine the channel from the interaction.");
	}

	const fetchedMessage = await channel.messages.fetch(messageId);
	if (!fetchedMessage) {
		throw new Error("Message not found.");
	}

	const attachment = fetchedMessage.attachments.first();
	if (!attachment || !attachment.name.endsWith(".txt")) {
		throw new Error("No valid text file attached to the referenced message.");
	}

	const response = await fetch(attachment.url);
	if (!response.ok) {
		throw new Error("Failed to fetch the attachment.");
	}
	const textContent = await response.text();

	// Replace every \cat\ with a random cat emoji
	return buildMessage(
		interaction.guild!,
		client,
		interactionMember,
		textContent,
		client.config.catEmojis
	);
}

/**
 * Extracts the message ID from a given link.
 */
function extractMessageId(messageLink: string): string {
	const messageIdMatch = messageLink.match(/\/(\d+)$/);
	if (!messageIdMatch) {
		throw new Error("Invalid message link format.");
	}
	return messageIdMatch[1];
}

/**
 * Posts the final messages in the appropriate channel.
 */
async function postMessages(interaction: ChatInputCommandInteraction, finalMessages: string[]) {
	if (
		interaction.channel instanceof TextChannel ||
		interaction.channel instanceof NewsChannel ||
		interaction.channel instanceof ForumChannel ||
		interaction.channel instanceof ThreadChannel
	) {
		for (const segment of finalMessages) {
			await interaction.channel.send(segment);
		}
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
}

export default command;
