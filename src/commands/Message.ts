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
				.setName("big_message_link")
				.setDescription("Link to a text file containing the message.")
				.setRequired(false)
		)
    .addStringOption((option) =>
			option
				.setName("reply_to")
				.setDescription("Link to a message you wish to reply.")
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
		const replyToLink = interaction.options.getString("reply_to");

		if (!message && !messageLink) {
			await interaction.reply({
				content: "You must provide either a message or a message link.",
				ephemeral: true,
			});
			return;
		}

		try {
			const finalMessages = await getFinalMessages(client, interaction, interactionMember, message, messageLink);
			await postMessages(interaction, finalMessages, replyToLink);
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
	const { channelId, messageId } = extractChannelAndMessageId(messageLink);
	const channel = await client.channels.fetch(channelId) as TextChannel | NewsChannel | ForumChannel | ThreadChannel;
	if (!channel) {
		throw new Error("Cannot determine the channel from the link.");
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
 * Extracts the channel ID and message ID from a given link.
 */
function extractChannelAndMessageId(messageLink: string): { channelId: string, messageId: string } {
	const match = messageLink.match(/\/(\d+)\/(\d+)\/(\d+)$/);
	if (!match) {
		throw new Error("Invalid message link format.");
	}
	return { channelId: match[2], messageId: match[3] };
}

/**
 * Posts the final messages in the appropriate channel, optionally replying to a specific message.
 */
async function postMessages(interaction: ChatInputCommandInteraction, finalMessages: string[], replyToLink: string | null) {
	if (
		interaction.channel instanceof TextChannel ||
		interaction.channel instanceof NewsChannel ||
		interaction.channel instanceof ForumChannel ||
		interaction.channel instanceof ThreadChannel
	) {
		let replyToMessage = null;
		if (replyToLink) {
			const { channelId, messageId } = extractChannelAndMessageId(replyToLink);
			if (channelId !== interaction.channel.id) {
				throw new Error("The message to reply to must be in the same channel.");
			}
			replyToMessage = await interaction.channel.messages.fetch(messageId);
		}

		for (const segment of finalMessages) {
			await interaction.channel.send({
				content: segment,
				reply: replyToMessage ? { messageReference: replyToMessage } : undefined,
			});
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
