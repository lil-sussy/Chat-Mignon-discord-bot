import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
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
		const userDisplayName = member.nickname || interaction.user.username;
		const firstLetter = userDisplayName.match(/[A-Z]/) ? userDisplayName.match(/[A-Z]/)![0] : userDisplayName.match(/[a-zA-Z0-9]/)![0];

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

		// Send the whisper & log in DB
		const sentMessage = await interaction.reply({
			embeds: [embed],
			fetchReply: true,
		});

		// Store the whisper content and message in the database
		await Confession.create({
			confessionId: crypto.randomUUID(),
			creatorHash: userIdHash,
			content: whisperText,
			messageId: sentMessage.id,
		});
	},
}; 