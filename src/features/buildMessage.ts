import { GuildMember, Guild } from "discord.js";
import clientConfig from "../config.json"; // Ensure you import the config
import ExtendedClient from "../classes/Client";
import EnglishVerbs, { mergeVerbsData, getConjugation } from 'english-verbs-helper';
import Irregular from 'english-verbs-irregular/dist/verbs.json';
import Gerunds from 'english-verbs-gerunds/dist/gerunds.json';

// Use mergeVerbsData to create the correct VerbsInfo structure
const VerbsData = mergeVerbsData(Irregular, Gerunds);

/**
 * Escapes markdown characters in a string to prevent formatting issues in Discord.
 */
function escapeMarkdown(text: string): string {
	return text.replace(/([\\_*~`|])/g, '\\$1');
}

/**
 * Replaces all "\cat\" (and optional "\ccat\") tokens with random cat emojis
 * from the config's catEmojis array. Also replaces pronouns based on the target's roles.
 */
export function buildMessage(guild: Guild, client: ExtendedClient, target: GuildMember | undefined, message: string, catEmojis: string[]): string[] {
	// Replace \cat\ with single cat emoji
	const pattern = /\\cat\\/g;
	let newText = message.replace(pattern, () => {
		const randomCatEmoji = catEmojis[Math.floor(Math.random() * catEmojis.length)];
		return escapeMarkdown(randomCatEmoji);
	});

	// Optionally replace \ccat\ with some variant
	const ccatPattern = /\\ccat\\/g;
	newText = newText.replace(ccatPattern, () => {
		const randomCatEmoji = catEmojis[Math.floor(Math.random() * catEmojis.length)];
		return escapeMarkdown(randomCatEmoji);
	});

	if (target) {
		const pronouns = extractPronounsFromRoles(target);
		const firstPersonPronoun = pronouns[0] || "they";
		const secondPersonPronoun = pronouns[1] || "them";
		const thirdPersonPossessivePronoun = pronouns[2] || "their";

		// Regex to find \1stPerson\ followed by a verb/tense
		const firstPersonPattern = /\\1stPerson\\\s+(\w+)\/(\w+)/gi;
		newText = newText.replace(firstPersonPattern, (match, verb, tense) => {
			const conjugatedVerb = getConjugation(VerbsData, verb, tense.toUpperCase(), 1, {});
			return `${firstPersonPronoun} ${conjugatedVerb}`;
		});

		// Regex to find \3dPerson\ followed by a verb/tense
		const secondPersonPattern = /\\2ndPerson\\\s+(\w+)\/(\w+)/gi;
		newText = newText.replace(secondPersonPattern, (match, verb, tense) => {
			const conjugatedVerb = getConjugation(VerbsData, verb, tense.toUpperCase(), 2, {});
			return `${secondPersonPronoun} ${conjugatedVerb}`;
		});
		// Regex to find \3dPerson\ followed by a verb/tense
		const thirdPersonPattern = /\\3rdPerson\\\s+(\w+)\/(\w+)/gi;
		newText = newText.replace(thirdPersonPattern, (match, verb, tense) => {
			const conjugatedVerb = getConjugation(VerbsData, verb, tense.toUpperCase(), 2, {});
			return `${thirdPersonPattern} ${conjugatedVerb}`;
		});

		// Replace \1stPerson\, \3dPerson\, and \3dPersonPossessive\
		newText = newText.replace(/\\1stPerson\\/g, firstPersonPronoun);
		newText = newText.replace(/\\2ndPerson\\/g, secondPersonPronoun);
		newText = newText.replace(/\\3rdPerson\\/g, thirdPersonPossessivePronoun);
		newText = newText.replace(/\\3rdPersonPossessive\\/g, thirdPersonPossessivePronoun);
	}

	// Replace all :emotes: with actual emotes from guild or config
	if (target && target.guild) {
		newText = newText.replace(/:(\w+):/g, (match, emoteName) => {
			const guildEmoji = guild.emojis.cache.find((emoji) => emoji.name === emoteName);
			if (guildEmoji) {
				return `<:${guildEmoji.name}:${guildEmoji.id}>`; // Construct the emote string manually
			}
			// If not found in guild emojis, check for Discord base emotes
			const baseEmoji = client.emojis.cache.find((emoji) => emoji.name === emoteName);
			return baseEmoji ? baseEmoji.toString() : match;
		});
	}

	// Split the message into segments if it exceeds Discord's message length limit
	const maxLength = 2000;
	const segments: string[] = [];
	let currentSegment = '';

	newText.split('\n').forEach(line => {
		if ((currentSegment + line).length + 1 > maxLength) {
			segments.push(currentSegment);
			currentSegment = line;
		} else {
			currentSegment += (currentSegment ? '\n' : '') + line;
		}
	});

	if (currentSegment) {
		segments.push(currentSegment);
	}

	return segments;
}

/**
 * Extracts pronouns from the target's roles.
 */
export function extractPronounsFromRoles(target: GuildMember): string[] {
	const roleNames = target.roles.cache.map(role => role.name.toLowerCase());
	const pronouns = [];
	roleNames.filter(role => role.includes("it"));

	if (roleNames.filter(role => role.includes("it")).length > 0) pronouns.push("it", "it", "its");
	else if (roleNames.filter((role) => role.includes("they")).length > 0) pronouns.push("they", "them", "their");
	else if (roleNames.filter((role) => role.includes("she")).length > 0) pronouns.push("she", "her", "her");
	else if (roleNames.filter((role) => role.includes("he")).length > 0) pronouns.push("he", "him", "his");

	// Prioritize pronouns: it > they > she > he
	return pronouns.length > 0 ? pronouns : ["they", "them", "their"];
} 