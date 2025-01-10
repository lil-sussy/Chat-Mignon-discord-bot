import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ChatInputCommand } from "../interfaces/Command";
import UserLink from "../models/FetlifeUserLink"; // Import the new model
import { fetchRSVPfromAllParisEvents } from "../features/fetchFetlifeEvents";
import ExtendedClient from "../classes/Client";
import { hasModPermission } from "../features/HasModPermissions";
import { FetlifeEvent, FetlifeUser } from "../path/to/types"; // Adjust the path as necessary

// Define the missing types
interface FetlifeEvent {
	// Define the properties of a FetlifeEvent
	id: string;
	name: string;
	date: Date;
	// Add other properties as needed
}

interface FetlifeUser {
	// Define the properties of a FetlifeUser
	id: string;
	username: string;
	// Add other properties as needed
}

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
