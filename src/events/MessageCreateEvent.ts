import { Message } from "discord.js";
import { Events, MessageReaction, User, TextChannel, DMChannel, PartialMessageReaction, PartialUser } from "discord.js";
import ExtendedClient from "../classes/Client";
import ReactionConfig from "../models/ReactionConfig";

import { Event } from '../interfaces';

const messageCreateEvent: Event = {
	name: "messageCreate",
	async execute(client: ExtendedClient, message: Message) {
		// Ignore bot messages to prevent loops
		if (message.author.bot) return;

		// Check for x.com links
		const xComPattern = /https?:\/\/(www\.)?x\.com\/\S*/i;
		if (xComPattern.test(message.content)) {
			await message.reply("You've used a link toward an x.com post, please make sure to look if the influencer/poster hasn't made the same post on [bluesky.com](https://bsky.app), and if not please use [xcancel.com](https://xcancel.com)");
		}

		// Check for Instagram and Facebook links
		const instaFbPattern = /https?:\/\/(www\.)?(instagram\.com|facebook\.com)\/\S*/i;
		if (instaFbPattern.test(message.content)) {
			await message.reply("Keep Instagram and Facebook posts to a minimum, please read the reason at: https://www.platformer.news/meta-new-trans-guidelines-hate-speech/");
		}

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

		// Check MongoDB if "feur" reactions are enabled
		const feurConfig = await ReactionConfig.findOne({ reactionName: "feur" });
		const isFeurEnabled = feurConfig?.enabled;

		if (isFeurEnabled) {
			const quoiPattern = /quoi(?=\s|$|[^\w])/i;
			const pourquoiPattern = /pour.*quoi/i;
			const cestQuoiPattern = /c'est .*? quoi/i;

			if (pourquoiPattern.test(message.content)) {
				await message.reply("Pour feur mec");
			} else if (cestQuoiPattern.test(message.content)) {
				await message.reply("C'est feur mec");
			} else if (quoiPattern.test(message.content)) {
				await message.reply("feur");
			}
		}
	},
};

export default messageCreateEvent;