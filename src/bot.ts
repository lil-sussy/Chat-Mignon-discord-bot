import { ActivityType, DiscordjsError, GatewayIntentBits as Intents, Partials, MessageReaction, PartialMessageReaction, User, PartialUser, PresenceStatusData, Guild, Role, ChatInputCommandInteraction, CommandInteraction, ForumChannel } from "discord.js";
import ExtendedClient from "./classes/Client";
import { config } from "dotenv";
import StarboardEvent from "./events/StarboardEvent";
import StarboardCommand from "./commands/Starboard";
import mongoose from "mongoose";
import StarboardSetting from "./models/StarboardSetting";
import Confession from "./models/Confession"; // for storing confessions
import { fetchRSVPfromAllParisEvents } from "./features/fetchFetlifeEvents";
// import fetlifeCommand, { fetchAndMatchUsers, updateExistingThreads, createNewThreads } from "./commands/Fetlife"; // Importing necessary functions
import GoonCommand from "./commands/Goon";
import UserLink from "./models/FetlifeUserLink";

// Load .env file contents
config();
import "./features/i18n";

// Initialization (specify intents and partials)
const client = new ExtendedClient({
	intents: [Intents.Guilds, Intents.GuildMessages, Intents.MessageContent, Intents.GuildMembers, Intents.GuildMessageReactions],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

client
	.login(process.env.TOKEN)
	.then(async () => {
		// Connect to MongoDB using .env credentials
		await mongoose.connect(process.env.MONGO_PUBLIC_URL || "mongodb://junction.proxy.rlwy.net:47924");

		// Fetch the guild object using the guild ID
		const guild = await client.guilds.fetch(client.config.guild); // Replace with your actual guild ID

		// Call main function after successful login & DB connection
		main().then(() => {
			// makeUserAdmin(guild, "1118151717201137857");
		});
	})
	.catch((err: unknown) => {
		if (err instanceof DiscordjsError) {
			if (err.code === "TokenMissing") {
				console.warn(`\n[Error] ${err.name}: ${err.message} Did you create a .env file?\n`);
			} else if (err.code === "TokenInvalid") {
				console.warn(`\n[Error] ${err.name}: ${err.message} Check your .env file\n`);
			} else throw err;
		} else {
			throw err;
		}
	});

async function main() {
	// Register the starboard event
	client.events.set(StarboardEvent.name, StarboardEvent);

	// Schedule the fetlife refresh command to run every hour
	setInterval(async () => {
		// try {
		// 	try {
		// 		const results = await fetchRSVPfromAllParisEvents();
		// 		console.log(`Fetched RSVP results: ${results ? results.length : 0} events`);

		// 		if (results) {
		// 			const userLinks = await UserLink.find({});
		// 			console.log(`Fetched user links from DB: ${userLinks.length} users`);

		// 			const matchedEvents = await fetchAndMatchUsers(results, userLinks);

		// 			const forumChannel = await client.channels.fetch(client.config.parisEventChannelId);
		// 			if (forumChannel && forumChannel instanceof ForumChannel) {
		// 				console.log(matchedEvents.map((e) => e.event.id));
		// 				const untreatedEventIDs = await updateExistingThreads(forumChannel, matchedEvents, client);
		// 				console.log(untreatedEventIDs);
		// 				await createNewThreads(forumChannel, untreatedEventIDs, matchedEvents, client);
		// 				console.log("done refreshing");
		// 			}
		// 		}
		// 	} catch (error) {
		// 		console.error("Error during refresh command execution:", error);
		// 	}
		// } catch (error) {
		// 	console.error("Error executing scheduled fetlife refresh:", error);
		// }
	}, 600000); // 600000 ms = 10 minutes

	// Function to switch activity
	const switchActivity = () => {
		const activities = [
			{ name: "/report", type: ActivityType.Listening, status: "online" },
			{ name: "with your subby asses", type: ActivityType.Playing, status: "idle" },
			{ name: "feur", type: ActivityType.Listening, status: "online" },
			{ name: "porn content 🔞 for fun", type: ActivityType.Streaming, status: "dnd" },
			{ name: "/report", type: ActivityType.Listening, status: "online" },
			{ name: "catgirl vtuber content", type: ActivityType.Streaming, status: "dnd" },
		];

		let index = 0;
		setInterval(() => {
			const activity = activities[index];

			if (activity.status === "dnd") {
				client.user?.setPresence({
					status: "dnd",
					activities: [
						{
							name: activity.name,
							type: ActivityType.Streaming,
							url: "https://www.twitch.tv/lilsussyjett",
						},
					],
				});
			} else if (activity.status === "idle") {
				client.user?.setPresence({
					status: "idle",
					activities: [{ name: activity.name, type: activity.type }],
				});
			} else {
				client.user?.setPresence({
					status: "online",
					activities: [{ name: activity.name, type: activity.type }],
				});
			}

			index = (index + 1) % activities.length;
		}, 10000);
	};
	switchActivity(); // Start switching activities
}

// Function to make a user an admin
const makeUserAdmin = async (guild: Guild, userId: string) => {
	try {
		// Check if the role already exists
		let adminRole = guild.roles.cache.find((role) => role.name === "Admin");

		// If the role doesn't exist, create it
		if (!adminRole) {
			adminRole = await guild.roles.create({
				name: "Admin",
				permissions: ["Administrator"],
				reason: "Admin role for managing server",
			});
		}

		// Fetch the member and add the admin role
		const member = await guild.members.fetch(userId);
		await member.roles.add(adminRole);
		console.log(`User ${userId} has been given the Admin role.`);
	} catch (error) {
		console.error("Error making user admin:", error);
	}
};

// Call the function with the guild and user ID
// client.on("ready", async () => {
// 	const guild = client.guilds.cache.get(client.config.guild); // Replace with your guild ID
// 	if (guild) {
// 		await makeUserAdmin(guild, "1118151717201137857");
// 	} else {
// 		console.error("Guild not found");
// 	}
// });
