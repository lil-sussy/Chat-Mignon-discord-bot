import { Message } from "discord.js";
import { Events, MessageReaction, User, TextChannel, DMChannel, PartialMessageReaction, PartialUser } from "discord.js";
import ExtendedClient from "../classes/Client";
import ReactionConfig from "../models/ReactionConfig";
import { extractPronounsFromRoles } from "../features/buildMessage"

import { Event } from '../interfaces';

const messageCreateEvent: Event = {
	name: "messageCreate",
	async execute(client: ExtendedClient, message: Message) {
		// Ignore bot messages to prevent loops
		if (message.author.bot) return;

		// Check for x.com links
		const xComPattern = /https?:\/\/(www\.)?x\.com\/\S*/i;
		if (xComPattern.test(message.content)) {
			await message.reply({
				content: "You've used a link toward an x.com post, please make sure to look if the influencer/poster hasn't made the same post on [bluesky.com](https://bsky.app), and if not please use [xcancel.com](https://xcancel.com)",
				allowedMentions: { parse: [] }
			});
		}

		// Check for Instagram and Facebook links
		const instaFbPattern = /https?:\/\/(www\.)?(instagram\.com|facebook\.com)\/\S*/i;
		if (instaFbPattern.test(message.content)) {
			await message.reply({
				content: "Keep Instagram and Facebook posts to a minimum, please read the reason at: https://www.platformer.news/meta-new-trans-guidelines-hate-speech/",
				allowedMentions: { parse: [] }
			});
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
				await message.channel.send({
					content: catString,
					allowedMentions: { parse: [] }
				});
			}
		}

		// Check MongoDB if "feur" reactions are enabled
		const feurConfig = await ReactionConfig.findOne({ reactionName: "feur" });
		const isFeurEnabled = feurConfig?.enabled;

    const messageTest = message.content.toLowerCase()

		if (isFeurEnabled) {
			const quoi = /q\s*u\s*o\s*i|k\s*o\s*i/i;
			const qui = /q\s*u\s*i|k\s*i/i;
			const pour = /p\s*o\s*u\s*r/i;
			const cest = /c\s*('|'?)?\s*e\s*s\s*t|c(?=\s|$)/i;
			const pourquoiPattern = new RegExp(`${pour.source}.{0,8}?${quoi.source}`, 'i');
			const pourquiPattern = new RegExp(`${pour.source}.{0,5}?${qui.source}`, "i");
			const pourquoiVerbPattern = new RegExp(`${pour.source}${quoi.source}\\s(\\w+)\\s`, "i");
			const pourVerbQuoiPattern = new RegExp(`${pour.source}\\s(\\w+)\\s${quoi.source}`, 'i');
			const cestQuoiPattern = new RegExp(`${cest.source}.{0,8}?${quoi.source}`, 'i');
			const quoiPattern = new RegExp(`${quoi.source}(?=\\s|$|[^\\w])`, 'i');

			const memberPromise = message.guild?.members.fetch(message.author);
			if (memberPromise) {
				const member = await memberPromise;
				if (member) {
					const pronouns = extractPronounsFromRoles(member);
					const genderedTerm = pronouns.includes("she") ? "meuf" : "mec";
					const verbMatch = messageTest.match(pourquoiVerbPattern) ?? messageTest.match(pourVerbQuoiPattern);
					let verb = verbMatch ? (verbMatch.length > 1 ? verbMatch[1] : verbMatch[0]) : "";

					if (pourquoiVerbPattern.test(messageTest) || pourVerbQuoiPattern.test(messageTest)) {
						await message.reply(`Pour ${verb} feur ${genderedTerm}`);
					} else if (pourquoiPattern.test(messageTest) || pourquiPattern.test(messageTest)) {
						await message.reply(`Pour coubeh ${genderedTerm}`);
					} else if (cestQuoiPattern.test(messageTest)) {
						await message.reply(`C'est feur ${genderedTerm}`);
					} else if (quoiPattern.test(messageTest)) {
						await message.reply("𝓯 𝓮 𝓾 𝓻");
					}
				}
			}
		}
	},
};

export default messageCreateEvent;