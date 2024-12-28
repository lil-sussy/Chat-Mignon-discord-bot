import { ChatInputCommandInteraction, Role, SlashCommandBuilder } from "discord.js";
import ExtendedClient from "../classes/Client";
import { ChatInputCommand } from "../interfaces";

const catEmojis = [
	"<( ⸝⸝•̀ - •́⸝⸝)>",
	"/ᐠ - ˕ -マ",
	"˶^•ﻌ•^˵",
	"૮₍˶ •. • ⑅₎ა ♡",
	"/ᐠ>ヮ<ᐟ\\ฅ",
	"(づ ᴗ _ᴗ)づ♡",
	"/ᐠ_ ꞈ _ᐟ\\ɴʏᴀ~",
	"ᨐᵐᵉᵒʷ",
	"(⁄ ⁄•⁄ω⁄•⁄ ⁄)",
	"(๑`^´๑)︻デ═一",
	"( -_•)︻デ═一",
	"( ︶︿︶)_╭∩╮",
	"𝗖𝗘𝗢 𝗢𝗙 𝗢𝗛𝗜𝗢",
	"(◍•ᴗ•◍)",
	"( ͜. ㅅ ͜. )🥛 yumy",
	"( ๑ ˃̵ᴗ˂˵)و ♡",
	"(˵ • ᴗ - ˵ ) ✧",
	"₍˄·͈༝·͈˄*₎◞ ̑̑",
	"≽^•⩊•^≼",
	"ᓚ₍ ^. ̫ .^₎",
	"ദ്ദി（• ˕ •マ.ᐟ",
	"⎛⎝ ≽  >  ⩊   < ≼ ⎠⎞",
	"(づ˶•༝•˶)づ♡",
	"(˶˃ᆺ˂˶)"
];

const command: ChatInputCommand = {
	options: new SlashCommandBuilder()
		.setName("update")
		.setDescription("Post a message to the update channel.")
		.addStringOption((option) => option.setName("message").setDescription("The message to post.").setRequired(true)),
	global: false, // Ensure this is false for guild commands

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		// Check if the user has the moderator role
		// (defined by config.moderatorRoleName)
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

		// Get the message content and channel from config
		const message = interaction.options.getString("message", true);

		// Replace every \cat\ with a random cat emoji
		const pattern = /\\cat\\/g;
		const updatedMessage = message.replace(pattern, () => {
			return catEmojis[Math.floor(Math.random() * catEmojis.length)];
		});

		const updateChannelId = client.config.updateChannelId;
		const updateChannel = interaction.guild?.channels.cache.get(updateChannelId);

		if (!updateChannel?.isTextBased()) {
			await interaction.reply({
				content: "Update channel not found or is not a text-based channel.",
				ephemeral: true,
			});
			return;
		}

		// Send the update message to the specified channel
		await updateChannel.send(updatedMessage);
		await interaction.reply({
			content: "Your message has been posted to the update channel!",
			ephemeral: true,
		});
	},
};

export default command;
