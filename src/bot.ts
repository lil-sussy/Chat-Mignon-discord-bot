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
  "( ๑ ˃̵ᴗ˂̵)و ♡",
  "(˵ • ᴗ - ˵ ) ✧",
  "₍˄·͈༝·͈˄*₎◞ ̑̑",
  "≽^•⩊•^≼",
  "ᓚ₍ ^. ̫ .^₎",
  "ദ്ദി（• ˕ •マ.ᐟ",
  "⎛⎝ ≽  >  ⩊   < ≼ ⎠⎞",
  "(づ˶•༝•˶)づ♡",
  "(˶˃ᆺ˂˶)"
];

async function main() {
	// Register the starboard event
	client.events.set(StarboardEvent.name, StarboardEvent);

	// Add event listener for messageReactionAdd
	client.on("messageReactionAdd", async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
		// Ensure the user is not a bot
		if (user.bot) return;

		// Fetch the reaction if it's partial
		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				console.error('Error fetching reaction:', error);
				return;
			}
		}

		await StarboardEvent.execute(client, reaction, user);
	});

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
			client.user?.setPresence({
				status: activity.status as PresenceStatusData,
				activities: [{ name: activity.name, type: activity.type }],
			});
			index = (index + 1) % activities.length; // Cycle through activities
		}, 10000); // Switch every 10 seconds
	};

	switchActivity(); // Start switching activities
}
