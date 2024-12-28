import { DiscordjsError, GatewayIntentBits as Intents, Partials } from 'discord.js';
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
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
    ],
});

client.login(process.env.TOKEN)
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

	// Register the starboard slash command
	client.commands.set(StarboardCommand.options.name, StarboardCommand);
}

main();