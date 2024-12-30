import { Message } from "discord.js";
import { Events, MessageReaction, User, TextChannel, DMChannel, PartialMessageReaction, PartialUser } from "discord.js";
import ExtendedClient from "../classes/Client";


import { Event } from '../interfaces';

const messageCreateEvent: Event = {
	name: "messageCreate",
	async execute(client: ExtendedClient, message: Message) {
		// Ignore bot messages to prevent loops
		if (message.author.bot) return;

		// Match each occurrence of \cat\
		const pattern = /\\cat\\/g;
		const matches = message.content.match(pattern);

		if (matches && matches.length > 0) {
			// Build a string of random cat emojis equal to the number of matches
			let catString = "";
			for (let i = 0; i < matches.length; i++) {
				catString += client.config.catEmojis[Math.floor(Math.random() * client.config.catEmojis.length)];
			}

			// Check if the channel is a TextChannel or DMChannel before sending
			if (message.channel instanceof TextChannel || message.channel instanceof DMChannel) {
				await message.channel.send(catString);
			}
		}
	},
};

export default messageCreateEvent;