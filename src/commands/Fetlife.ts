import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, TextChannel, NewsChannel, ForumChannel } from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import UserLink from "../models/FetlifeUserLink";
import { fetchRSVPfromAllParisEvents } from "../features/fetchFetlifeEvents";
import ExtendedClient from "../classes/Client";
import { hasModPermission } from "../features/HasModPermissions";
import type { FetlifeEvent, FetlifeUser } from "../features/fetchFetlifeEvents";

interface item {
	event: FetlifeEvent;
	rsvp: FetlifeUser[];
}

function parseDescription(description: string): string {
	const euroLines = description
		.split('\n')
		.filter(line => line.includes('€'))
		.join('\n');

	const combinedDescription = `Price:\n${euroLines}\n\n${description}`;
	return combinedDescription.substring(0, 1024);
}

function formatToParisTime(dateString: string): string {
	const date = new Date(dateString);
	const options: Intl.DateTimeFormatOptions = {
		timeZone: 'Europe/Paris',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	};
	return new Intl.DateTimeFormat('en-GB', options).format(date);
}

const fetlifeCommand: ChatInputCommand = {
	options: new SlashCommandBuilder()
		.setName("fetlife")
		.setDescription("Fetlife related commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("refresh")
				.setDescription("Refreshes the RSVP list from all Paris events")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("link")
				.setDescription("Link your Fetlife account")
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("Your Fetlife.com username")
						.setRequired(true)
				)
		),
	global: false,

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		console.log(`Executing subcommand: ${subcommand}`);

		if (subcommand === "refresh") {
			try {
				await interaction.deferReply({ ephemeral: true });
				console.log("Deferred reply for refresh command.");

				const hasPermission = await hasModPermission(client, interaction);
				console.log(`User has permission: ${hasPermission}`);
				if (!hasPermission) {
					await interaction.editReply({ content: "You do not have permission to execute this command." });
					return;
				}

				const results = await fetchRSVPfromAllParisEvents();
				console.log(`Fetched RSVP results: ${results ? results.length : 0} events`);

				if (results) {
					const matchedEvents = [];
					const userLinks = await UserLink.find({});
					console.log(`Fetched user links from DB: ${userLinks.length} users`);

					for (const item of results) {
						console.log(`Processing event: ${item.event.name}`);
						const matchedUsers = [];

						for (const userLink of userLinks) {
							const rsvpUser = item.rsvp.find(rsvp => rsvp.userID === userLink.fetlifeID || rsvp.username === userLink.fetlifeUsername);
							if (rsvpUser) {
								console.log(`Matched user: ${rsvpUser.username}`);
								await UserLink.updateOne(
									{ fetlifeUsername: rsvpUser.username },
									{ $set: { fetlifeID: rsvpUser.userID } }
								);

								matchedUsers.push({
									discordId: userLink.discordId,
									username: rsvpUser.username
								});
							}
						}

						if (matchedUsers.length > 0) {
							console.log(`Matched users for event: ${matchedUsers.length}`);
							matchedEvents.push({
								event: item.event,
								users: matchedUsers
							});

							const embed = new EmbedBuilder()
								.setTitle(item.event.name)
								.setDescription(parseDescription(item.event.description))
								.addFields(
									{ name: "Start Date", value: formatToParisTime(item.event.start_date_time), inline: true },
									{ name: "End Date", value: formatToParisTime(item.event.end_date_time), inline: true },
									{ name: "Location", value: item.event.location, inline: true }
								)
								.setColor(client.config.colors.embed);

							const forumChannel = await client.channels.fetch(client.config.parisEventChannelId);
							if (forumChannel && forumChannel instanceof ForumChannel) {
								console.log(`Creating thread in forum channel: ${forumChannel.id}`);
								const thread = await forumChannel.threads.create({
									name: `${item.event.start_date_time.split("T")[0].split("-").reverse().join("/")} - ${item.event.name} - ${item.event.id}`,
									message: {
										content: `Event: ${item.event.name}`,
										embeds: [embed],
									},
								});
								console.log(`Started thread: ${thread.id}`);

								const userMentions = matchedUsers.map((user) => `<@${user.discordId}>`);
								const maxMentionsPerMessage = 50;
								for (let i = 0; i < userMentions.length; i += maxMentionsPerMessage) {
									const mentionsChunk = userMentions.slice(i, i + maxMentionsPerMessage).join(", ");
									await thread.send(`The following users have mentioned they are going to this event: ${mentionsChunk}`);
									console.log(`Sent mentions chunk: ${mentionsChunk}`);
								}
							} else {
								console.log(`Could not find forum channel to create thread: ${client.config.parisEventChannelId}`);
							}
						}
					}
				}

				await interaction.editReply({ content: "RSVP list has been successfully refreshed." });
				console.log("RSVP list refresh completed.");
			} catch (error) {
				console.error("Error during refresh command execution:", error);
				await interaction.editReply({ content: "An error occurred while refreshing the RSVP list." });
			}
		} else if (subcommand === "link") {
			try {
				const fetlifeUsername = interaction.options.getString("username", true);
				const discordId = interaction.user.id;
				console.log(`Linking Fetlife account: ${fetlifeUsername} for Discord ID: ${discordId}`);

				await UserLink.findOneAndUpdate(
					{ discordId },
					{ fetlifeUsername },
					{ upsert: true, new: true }
				);
				await interaction.reply({ content: `Your Fetlife account has been linked as ${fetlifeUsername}.`, ephemeral: true });
				console.log("Fetlife account linked successfully.");
			} catch (error) {
				console.error("Error linking Fetlife account:", error);
				await interaction.reply({ content: "An error occurred while linking your Fetlife account.", ephemeral: true });
			}
		}
	}
};

export default fetlifeCommand;
