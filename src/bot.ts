import { ActivityType, DiscordjsError, GatewayIntentBits as Intents, Partials, MessageReaction, PartialMessageReaction, User, PartialUser, PresenceStatusData } from 'discord.js';
import ExtendedClient from './classes/Client';
import { config } from 'dotenv';
import StarboardEvent from "./events/StarboardEvent";
import StarboardCommand from "./commands/Starboard";

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
    .then(() => {
        // Call main function after successful login
        main().then(() => {
        })
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
