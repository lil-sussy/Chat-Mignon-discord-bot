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
		const catPattern = /\\cat\\/g;
		const catMatches = message.content.match(catPattern);

		if (catMatches && catMatches.length > 0) {
			// Build a string of random cat emojis equal to the number of matches
			let catString = "";
			for (let i = 0; i < catMatches.length; i++) {
				catString += client.config.catEmojis[Math.floor(Math.random() * client.config.catEmojis.length)];
			}

			// Check if the channel is a TextChannel or DMChannel before sending
			if (message.channel instanceof TextChannel || message.channel instanceof DMChannel) {
				await message.channel.send(catString);
			}
		}

		// New pattern for "quoi" with reaction "feur"
		const quoiPattern = /quoi(?=\s|$|[^\w])/i;
		const pourquoiPattern = /pour.*quoi/i;
		if (pourquoiPattern.test(message.content)) {
			await message.reply("pour feur mec");
		} else if (quoiPattern.test(message.content)) {
			await message.reply("feur");
		}
	},
};

export default messageCreateEvent;