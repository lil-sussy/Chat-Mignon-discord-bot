import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import crypto from "crypto";
import Confession from "../models/Confession";
import ExtendedClient from "../classes/Client";
import ConfessionSetting from "../models/ConfessionSetting";

function flagColor(count: number) {
	const transFlag = [0x5bcefa, 0xf5a9b8, 0xffffff, 0xf5a9b8, 0x5bcefa];
	const lgbtqFlag = [0xe40303, 0xff8c00, 0xffed00, 0x008026, 0x24408e, 0x732982];
	const allFlags = [...transFlag, ...lgbtqFlag];

	// Return the color by cycling through allFlags
	return allFlags[count % allFlags.length];
}

export default {
	options: new SlashCommandBuilder()
		.setName("whisper")
		.setDescription("Whisper a message in the current channel")
		.addStringOption((option) => option.setName("message").setDescription("Your whisper text").setRequired(true)),

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		const whisperText = interaction.options.getString("message", true);

		// Hash the user ID to keep it anonymous in the logs
		const userIdHash = crypto.createHash("sha256").update(interaction.user.id).digest("hex").slice(0, 10);

		// Get the first letter of the user's nickname or username
		const member = interaction.member as GuildMember;
		const userDisplayName = member.nickname || interaction.user.globalName || interaction.user.username;
		const capitalMatch = userDisplayName.match(/[A-Z]/);
		const alphaNumMatch = userDisplayName.match(/[a-zA-Z0-9]/);
		const firstLetter = capitalMatch ? capitalMatch[0] : alphaNumMatch ? alphaNumMatch[0] : "";

		// Pull and increment the channel's color index
		const confessionSetting = await ConfessionSetting.findOneAndUpdate(
			{ channelId: interaction.channelId },
			{ $inc: { colorIndex: 1 } },
			{ upsert: true, new: true }
		);

		// Retrieve the updated color index and get its corresponding color
		const color = flagColor(confessionSetting?.colorIndex ?? 0);

		// Build the whisper embed
		const embed = new EmbedBuilder()
			.setTitle(`${firstLetter} whispers...`)
			.setDescription(whisperText)
			.setColor(color);

		// Defer the reply
		await interaction.deferReply({ ephemeral: true });

		// Ensure the channel is a TextChannel before sending the message
		if (interaction.channel instanceof TextChannel) {
			// Then send the embed as a separate message visible to everyone, without mentioning the user who triggered the slash command
			const sentMessage = await interaction.channel.send({
				embeds: [embed],
			});

			// Store the whisper content and message in the database
			await Confession.create({
				confessionId: crypto.randomUUID(),
				creatorHash: userIdHash,
				content: whisperText,
				messageId: sentMessage.id,
				channelId: interaction.channelId,
			});

			// Finally, edit the deferred reply so the "is thinking..." disappears
			await interaction.editReply({ content: 'Your whisper has been posted!' });
		} else {
			console.error("The channel is not a TextChannel.");
		}
	},
}; 