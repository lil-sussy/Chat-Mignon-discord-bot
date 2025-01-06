import { Client, GatewayIntentBits } from "discord.js";
import ExtendedClient from "./classes/Client";
import TicketCommand from "./commands/Ticket";

// Assuming you have a function to register commands
async function registerCommands(client: ExtendedClient) {
  client.commands.set(TicketCommand.options.name, TicketCommand);
  // Register other commands...
}

// Initialize your client
const client = new ExtendedClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
  registerCommands(client);
});

client.login("YOUR_BOT_TOKEN"); 