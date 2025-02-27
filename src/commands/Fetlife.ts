/*
## Role
You are an expert senior 10x developer who uses vim.

## Task
You are tasked to refactor this code to make it respects ISO standards and clean architecthure standards. 
It is imperative that you repect the neat logic already implemented. 

## important
You should value moving code in seperate functions / commenting code over deleting logic
You should move code in seperate functions.
*/
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ForumChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, AttachmentBuilder, ThreadChannel } from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import UserLink from "../models/FetlifeUserLink";
import { fetchRSVPfromAllParisEvents, fetchEventImage } from "../features/fetchFetlifeEvents";
import ExtendedClient from "../classes/Client";
import { cropStringWithEllipses } from "../utils/StringUtils";
import { hasModPermission } from "../features/HasModPermissions";
import sharp from "sharp";
import { logError, logInfo } from "../utils/Logger";

import type { FetlifeEvent, FetlifeUser } from "../features/fetchFetlifeEvents";

enum ThreadAutoArchiveDuration {
	OneHour = 60, // 1 hour
	OneDay = 1440, // 1 day
	ThreeDays = 4320, // 3 days
	OneWeek = 10080, // 1 week
}

interface item {
	event: FetlifeEvent;
	rsvp: FetlifeUser[];
}

// Define a type for user links if not already defined
interface UserLinkType {
	fetlifeID: string;
	fetlifeUsername: string;
	discordId: string;
}

function parseDescription(event: FetlifeEvent): string {
	const euroLines =
		event.cost ??
		event.description
			.split("\n")
			.filter((line) => line.includes("€"))
			.join("\n");

	const combinedDescription = `Link: https://fetlife.com/events/${event.id}\n\nPrice:\n${euroLines}\n\n${event.category === "social" ? "🌟🌟🌟🌟🌟" : event.description}`;
	return combinedDescription.substring(0, 1024);
}

function formatToDiscordTimestamp(dateString: string): string {
	const date = new Date(dateString);
	return `<t:${Math.floor(date.getTime() / 1000)}>`;
}

async function matchUsersWithEvents(results: item[], userLinks: UserLinkType[]): Promise<item[]> {
	const matchedEvents: item[] = [];
	logInfo("Matching users with events...");

	for (const item of results) {
		const matchedUsers: FetlifeUser[] = [];
		for (const rsvpUser of item.rsvp) {
			const userLink = userLinks.find((link) => link.fetlifeID === rsvpUser.userID || link.fetlifeUsername?.toLowerCase() === rsvpUser.username?.toLowerCase());
			if (userLink) {
				await UserLink.updateOne({ fetlifeUsername: rsvpUser.username }, { $set: { fetlifeID: rsvpUser.userID } });
				const matchedUser: FetlifeUser = { userID: rsvpUser.userID, username: rsvpUser.username, discordId: userLink.discordId };
				matchedUsers.push(matchedUser);
				rsvpUser.discordId = userLink.discordId;
			}
		}
		if (matchedUsers.length > 0) {
			matchedEvents.push({ event: item.event, rsvp: matchedUsers });
		}
	}
	return matchedEvents;
}

export async function updateExistingThreads(forumChannel: ForumChannel, matchedEvents: item[], client: ExtendedClient) {
	let untreatedEventIDs: number[] = matchedEvents.map((e) => e.event.id);
	console.log("Checking existing threads for updates...");

	const fetchedThreads = await forumChannel.threads.fetchActive();
	for (const [threadId, existingThread] of fetchedThreads.threads) {
		// Extract the eventID from the thread name, if you stored it last time.
		const match = existingThread.name.match(/.* - .* - (\d+)$/);
		if (!match) continue;

		const threadEventId = Number(match[1]);

		const currentItem = matchedEvents.find((e) => e.event.id === threadEventId);
		if (!currentItem) {
			console.log(`No matching event found for thread ${existingThread.name}, weird...`);
			continue;
		}
		untreatedEventIDs = untreatedEventIDs.filter((id) => id != currentItem.event.id);

		// 1) Check if the event has ended
		const eventEndDate = new Date(currentItem.event.end_date_time);
		if (new Date() > eventEndDate) {
			await existingThread.setArchived(true);
			continue;
		}

		// 2) Update thread post if event details have changed
		await handleThreadUpdates(existingThread, currentItem, client);

		// 3) Check if new users have registered
		const botMessages = await existingThread.messages.fetch({ limit: 50 });
		const existingMentions = new Set<string>();
		for (const [, message] of botMessages) {
			if (message.author.id === client.user?.id) {
				const userIdMatches = message.content.match(/<@(\d+)>/g) || [];
				userIdMatches.forEach((mention) => {
					existingMentions.add(mention);
				});
			}
		}

		const threadMatchedUsers = currentItem.rsvp.filter((u) => u.discordId) || [];
		const unmentionedUsers = threadMatchedUsers.filter((u) => {
			const mention = `<@${u.discordId}>`;
			return !existingMentions.has(mention);
		});

		if (unmentionedUsers.length > 0) {
			const newUserMentions = unmentionedUsers.map((u) => `<@${u.discordId}>`).join(", ");
			await existingThread.send(`Those users have mentioned that they will also go to the event: ${newUserMentions}\n-# Stop pinging me ? use /fetlife revoke`);
		}
	}
	return untreatedEventIDs;
}

async function handleThreadUpdates(existingThread: ThreadChannel, currentItem: item, client: ExtendedClient) {
	try {
		const imageBuffer = await fetchEventImage(currentItem.event.cover_image);
		if (imageBuffer) {
			const processedImageBuffer = await sharp(imageBuffer).toFormat("png").toBuffer();
			const attachment = new AttachmentBuilder(processedImageBuffer, { name: "cover.png" });

			const updatedEmbed = new EmbedBuilder()
				.setTitle(currentItem.event.name)
				.setDescription(parseDescription(currentItem.event))
				.addFields(
					{ name: "Start Date", value: formatToDiscordTimestamp(currentItem.event.start_date_time), inline: true },
					{ name: "End Date", value: formatToDiscordTimestamp(currentItem.event.end_date_time), inline: true },
					{ name: "Location", value: currentItem.event.place.full_name, inline: true },
					{ name: "Club", value: currentItem.event.location, inline: true }
				)
				.setColor(client.config.colors.embed);

			const starterMessage = await existingThread.fetchStarterMessage();
			if (starterMessage) {
				await starterMessage.edit({
					files: [attachment],
					embeds: [updatedEmbed],
				});
			}
		}
	} catch (error) {
		logError("Error updating thread post:", error as unknown as string);
	}
}

export async function createNewThreads(forumChannel: ForumChannel, untreatedEventIDs: number[], matchedEvents: item[], client: ExtendedClient) {
	console.log("Creating new threads...");
	for (const eventID of untreatedEventIDs) {
		const item = matchedEvents.find((e) => e.event.id === eventID);
		if (!item) return;

		const { embed, attachment } = await createEventEmbedWithImage(item.event, client);

		const eventEndDate = new Date(item.event.end_date_time);
		const currentDate = new Date();
		const duration = Math.floor((eventEndDate.getTime() - currentDate.getTime()) / (1000 * 60));

		let autoArchiveDuration: number | null;
		if (duration <= ThreadAutoArchiveDuration.OneHour) {
			autoArchiveDuration = ThreadAutoArchiveDuration.OneHour;
		} else if (duration <= ThreadAutoArchiveDuration.OneDay) {
			autoArchiveDuration = ThreadAutoArchiveDuration.OneDay;
		} else if (duration <= ThreadAutoArchiveDuration.ThreeDays) {
			autoArchiveDuration = ThreadAutoArchiveDuration.ThreeDays;
		} else {
			autoArchiveDuration = null;
		}

		const thread = await forumChannel.threads.create({
			name: `${item.event.start_date_time.split("T")[0].split("-").reverse().join("/")} - ${cropStringWithEllipses(item.event.name, 60)} - ${item.event.id}`,
			message: {
				embeds: [embed],
				files: attachment ? [attachment] : [],
			},
			// @ts-ignore
			icon: item.event.cover_image,
		});
		console.log(`Started thread: ${thread.id}`);

		// Create a button for adding to calendar
		const calendarButton = new ButtonBuilder().setLabel("Add to Calendar").setStyle(ButtonStyle.Link).setURL(`https://fetlife.com/events/${item.event.id}/calendar.ics?source=Event+Show`);

		const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(calendarButton);

		// Send the button message
		await thread.send({ components: [actionRow] });

		const userMentions = item.rsvp.map((user) => `<@${user.discordId}>`);
		const maxMentionsPerMessage = 50;
		for (let i = 0; i < userMentions.length; i += maxMentionsPerMessage) {
			const mentionsChunk = userMentions.slice(i, i + maxMentionsPerMessage).join(", ");
			await thread.send(`The following users have mentioned they are going to this event: ${mentionsChunk}\n-# Stop pinging me ? use /fetlife revoke`);
		}
	}
}

export async function createSocialEventPosts(channel: any, munchEvents: item[], client: ExtendedClient) {
	// console.log("Posting social events in munch channel...");
	// for (const eventItem of munchEvents) {
	// 	try {
	// 		const { embed, attachment } = await createEventEmbedWithImage(eventItem.event, client);
	// 		// Send embed + image
	// 		const munchMessage = await channel.send({
	// 			embeds: [embed],
	// 			files: attachment ? [attachment] : [],
	// 		});
	// 		// Send user mentions in chunks
	// 		const userMentions = eventItem.rsvp.map((user) => `<@${user.discordId}>`);
	// 		const maxMentionsPerMessage = 50;
	// 		for (let i = 0; i < userMentions.length; i += maxMentionsPerMessage) {
	// 			const mentionsChunk = userMentions.slice(i, i + maxMentionsPerMessage).join(", ");
	// 			await channel.reply(
	//         munchMessage,
	// 				`The following users have mentioned they are going to this event: ${mentionsChunk}\n-# Stop pinging me ? use /fetlife revoke`
	// 			);
	// 		}
	// 	} catch (error) {
	// 		console.error("Error creating social event post:", error);
	// 	}
	// }
}

async function createEventEmbedWithImage(event: FetlifeEvent, client: ExtendedClient): Promise<{ embed: EmbedBuilder; attachment?: AttachmentBuilder }> {
	try {
		let attachment;
		if (event.category !== "social") {
			const imageBuffer = await fetchEventImage(event.cover_image);
			if (imageBuffer) {
				const processedImageBuffer = await sharp(imageBuffer).toFormat("png").toBuffer();
				attachment = new AttachmentBuilder(processedImageBuffer, { name: "cover.png" });
			}
		}

		const embed = new EmbedBuilder()
			.setTitle(event.name)
			.setDescription(parseDescription(event))
			.addFields({ name: "Start Date", value: formatToDiscordTimestamp(event.start_date_time), inline: true }, { name: "End Date", value: formatToDiscordTimestamp(event.end_date_time), inline: true }, { name: "Location", value: event.place.full_name, inline: true }, { name: "Club", value: event.location, inline: true })
			.setColor(client.config.colors.embed);

		return { embed, attachment };
	} catch (error) {
		console.error("Error creating event embed with image:", error);
		return { embed: new EmbedBuilder().setTitle(event.name).setDescription("Error loading event details.") };
	}
}

const fetlifeCommand: ChatInputCommand = {
	options: new SlashCommandBuilder()
		.setName("fetlife")
		.setDescription("Fetlife related commands")
		.addSubcommand((subcommand) => subcommand.setName("refresh").setDescription("Refreshes the RSVP list from all Paris events"))
		.addSubcommand((subcommand) =>
			subcommand
				.setName("link")
				.setDescription("Link your Fetlife account")
				.addStringOption((option) => option.setName("username").setDescription("Your Fetlife.com username").setRequired(true))
		)
		.addSubcommand((subcommand) => subcommand.setName("revoke").setDescription("Revoke your Fetlife account link")),
	global: false,

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		const subcommand = interaction!.options.getSubcommand();
		logInfo(`Executing subcommand: ${subcommand}`);

		if (subcommand === "refresh") {
			try {
				await interaction!.deferReply({ ephemeral: true });

				const hasPermission = await hasModPermission(client, interaction!);
				if (!hasPermission) {
					await interaction!.editReply({ content: "You do not have permission to execute this command." });
					return;
				}

				const results = await fetchRSVPfromAllParisEvents();
				logInfo(`Fetched RSVP results: ${results ? results.length : 0} events`);

				if (results) {
					const userLinks = await UserLink.find({});
					logInfo(`Fetched user links from DB: ${userLinks.length} users`);

					const matchedEvents = await matchUsersWithEvents(results, userLinks);

					// Separate events by category
					const munchEvents = matchedEvents.filter((e) => e.event.category?.toLowerCase() === "social");
					const normalEvents = matchedEvents.filter((e) => e.event.category?.toLowerCase() !== "social");

					// Handle "social" events by posting in munch channel
					if (munchEvents.length) {
						const munchChannel = await client.channels.fetch(client.config.munchChannelID);
						if (munchChannel?.isTextBased()) {
							await createSocialEventPosts(munchChannel, munchEvents, client);
						}
					}

					// Handle other events via forum threads
					if (normalEvents.length) {
						const forumChannel = await client.channels.fetch(client.config.parisEventChannelId);
						if (forumChannel && forumChannel instanceof ForumChannel) {
							logInfo(normalEvents.map((e) => e.event.id).toString());
							const untreatedEventIDs = await updateExistingThreads(forumChannel, normalEvents, client);
							logInfo(untreatedEventIDs.toString());
							await createNewThreads(forumChannel, untreatedEventIDs, normalEvents, client);
							logInfo("done refreshing");
						}
					}
				}

				await interaction!.editReply({ content: "RSVP list has been successfully refreshed." });
			} catch (error) {
				logError("Error during refresh command execution:", error as unknown as string);
				await interaction!.editReply({ content: "An error occurred while refreshing the RSVP list." });
			}
		} else if (subcommand === "link") {
			try {
				const fetlifeUsername = interaction!.options.getString("username", true);
				const discordId = interaction!.user.id;

				await UserLink.findOneAndUpdate({ discordId }, { fetlifeUsername }, { upsert: true, new: true });
				await interaction!.reply({ content: `Your Fetlife account has been linked as ${fetlifeUsername}.`, ephemeral: true });

				// Trigger the refresh logic after linking
				await interaction!.followUp({ content: "Refreshing RSVP list...", ephemeral: true });
				// await this.execute(client, interaction!); // Call the refresh logic
			} catch (error) {
				console.error("Error linking Fetlife account:", error);
				await interaction!.reply({ content: "An error occurred while linking your Fetlife account.", ephemeral: true });
			}
		} else if (subcommand === "revoke") {
			try {
				const discordId = interaction!.user.id;

				const result = await UserLink.findOneAndDelete({ discordId });
				if (result) {
					await interaction!.reply({ content: "Your Fetlife account link has been successfully revoked.", ephemeral: true });
				} else {
					await interaction!.reply({ content: "No linked Fetlife account found to revoke.", ephemeral: true });
				}
			} catch (error) {
				console.error("Error revoking Fetlife account link:", error);
				await interaction!.reply({ content: "An error occurred while revoking your Fetlife account link.", ephemeral: true });
			}
		}
	},
};

export default fetlifeCommand;
