import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, GuildMember, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageComponentInteraction, Message, ButtonInteraction } from "discord.js";
import crypto from "crypto";
import ConfessionDB from "../models/Confession";
import ExtendedClient from "../classes/Client";
import ConfessionSetting from "../models/ConfessionSetting";
import { createTicketChannel } from "../utils/ChannelCreator";

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
		.addStringOption((option) =>
			option
				.setName("display_name")
				.setDescription("Name to display in the whisper")
				.setRequired(true)
		).addStringOption((option) => option.setName("message").setDescription("Your whisper text").setRequired(true)),

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		const whisperText = interaction.options.getString("message", true);
		const providedDisplayName =
			interaction.options.getString("display_name", false) || null;

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
			.setTitle(providedDisplayName ? `${providedDisplayName} whispers...` : `${firstLetter} whispers...`)
			.setDescription(whisperText)
			.setColor(color);

		// Defer the reply
		await interaction.deferReply({ ephemeral: true });

		// Ensure the channel is a TextChannel before sending the message
		if (interaction.channel instanceof TextChannel) {
			// Then send the embed as a separate message visible to everyone, without mentioning the user who triggered the slash command
			const sentMessage = await interaction.channel.send({
				embeds: [embed],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId("report_whisper")
							.setLabel("Report")
							.setStyle(ButtonStyle.Danger)
					)
				],
			});

			// Store the whisper content and message in the database
			const createdConfession = await ConfessionDB.create({
				confessionId: crypto.randomUUID(),
				creatorHash: userIdHash,
				content: whisperText,
				messageId: sentMessage.id,
				channelId: interaction.channelId,
			});

			// Finally, edit the deferred reply so the "is thinking..." disappears
			await interaction.editReply({ content: 'Your whisper has been posted!' });

			// Listen for the "Report" button click
			const filter = (i: MessageComponentInteraction) =>
				i.customId === "report_whisper" && i.message.id === sentMessage.id;

			const collector = sentMessage.createMessageComponentCollector({ filter, time: 600_000 });

			collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
				await buttonInteraction.reply({ content: "Reporting this whisper...", ephemeral: true });

				try {
					// 1) Retrieve the existing Confession by its _id
					const foundConfession = await ConfessionDB.findById(createdConfession._id);
					if (!foundConfession) {
						return buttonInteraction.followUp({ content: "Confession not found.", ephemeral: true });
					}

					// 2) Mark this user as a reporter if not already
					if (!foundConfession.reportedBy) {
						foundConfession.reportedBy = [];
					}
					if (!foundConfession.reportedBy.includes(buttonInteraction.user.id)) {
						foundConfession.reportedBy.push(buttonInteraction.user.id);
					}

					// 3) Check if a ticket channel has been created
					let ticketChannelId = foundConfession.ticketChannelId;
					if (!ticketChannelId) {
						// 3a) Create a new ticket channel and store its ID
						const channel = await createTicketChannel({
							client,
							guild: buttonInteraction.guild!,
							channelNames: [`whisper-report-${foundConfession._id}`, "whisper-report"],
							categoryName: client.config.moderationCategoryName,
							whoCanDelete: "mods",
							hasSecondButton: false,
							userIds: [buttonInteraction.user.id],
							content:
								`@${client.config.moderatorRoleName}, this whisper was reported!\n` +
								`• Whisper/Confession ID: ${foundConfession._id}\n` +
								`• Whisper text: ${foundConfession.content}\n` +
								`• Reporter: ${buttonInteraction.user}\n`
						});
						ticketChannelId = channel.id;
						foundConfession.ticketChannelId = channel.id;
					} else {
						// 3b) If ticket channel already exists, add the new reporter to its permission overwrites
						const existingChannel = buttonInteraction.guild?.channels.cache.get(ticketChannelId);
						if (existingChannel?.isTextBased()) {
							const textChannel = existingChannel as TextChannel;
							await textChannel.permissionOverwrites.create(buttonInteraction.user.id, {
								ViewChannel: true,
								SendMessages: true
							});
						}
					}

					// 4) If 3+ unique reporters, remove the message from Discord
					if (foundConfession.reportedBy.length >= 3) {
						const whisperMessage = buttonInteraction.channel?.messages.cache.get(foundConfession.messageId);
						if (whisperMessage) {
							await whisperMessage.delete().catch((err) => console.error("Failed to delete message:", err));
						}
					}

					// Save updates to DB
					await foundConfession.save();
				} catch (err) {
					console.error("Error reporting whisper:", err);
					await buttonInteraction.followUp({
						content: "Failed to create or update the report ticket.",
						ephemeral: true,
					});
				}
			});
		} else {
			console.error("The channel is not a TextChannel.");
		}
	},
}; 