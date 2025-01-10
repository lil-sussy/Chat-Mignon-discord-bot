import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import UserLink from "../models/FetlifeUserLink"; // Import the new model
import { fetchRSVPfromAllParisEvents } from "../features/fetchFetlifeEvents";
import ExtendedClient from "../classes/Client";
import { hasModPermission } from "../features/HasModPermissions";
import type { FetlifeEvent, FetlifeUser } from "../features/fetchFetlifeEvents"; // Adjust the path as necessary

interface item {
	event: FetlifeEvent;
	rsvp: FetlifeUser[];
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
	global: false, // Or true, depending on whether you want it enabled across all guilds

	async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "refresh") {
			const hasPermission = await hasModPermission(client, interaction);
			if (!hasPermission) return;

			const results = await fetchRSVPfromAllParisEvents();

			if (results) {
				const matchedEvents = [];

				for (const item of results) {
					const matchedUsers = [];

					for (const rsvpUser of item.rsvp) {
						// Find the user in MongoDB
						const userLink = await UserLink.findOne({ fetlifeUsername: rsvpUser.username });
						if (userLink) {
							// Update the userLink with the event ID or any other necessary information
							await UserLink.updateOne(
								{ fetlifeUsername: rsvpUser.username },
								{ $set: { fetlifeID: rsvpUser.userID } } // Assuming you want to store the event ID
							);

							// Add the matched user to the list
							matchedUsers.push({
								discordId: userLink.discordId,
								username: rsvpUser.username
							});
						}
					}

					if (matchedUsers.length > 0) {
						matchedEvents.push({
							event: item.event,
							users: matchedUsers
						});
					}
				}

				// You can now use `matchedEvents` as needed, e.g., logging or further processing
				console.log("Matched Events:", matchedEvents);
			}

			await interaction.reply({ content: "RSVP list refreshed.", ephemeral: true });
		} else if (subcommand === "link") {
			const fetlifeUsername = interaction.options.getString("username", true);
			const discordId = interaction.user.id;

			// Use the UserLink model to save the Fetlife username linked to the Discord ID
			await UserLink.findOneAndUpdate(
				{ discordId },
				{ fetlifeUsername },
				{ upsert: true, new: true }
			);
			await interaction.reply({ content: `Your Fetlife account has been linked as ${fetlifeUsername}.`, ephemeral: true });
		}
	}
};

export default fetlifeCommand;
