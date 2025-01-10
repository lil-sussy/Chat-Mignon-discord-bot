import { GuildMember } from "discord.js";

/**
 * Replaces all "\cat\" (and optional "\ccat\") tokens with random cat emojis
 * from the config's catEmojis array. Also replaces pronouns based on the target's roles.
 */
export function buildMessage(target: GuildMember | undefined, message: string, catEmojis: string[]): string {
  // Replace \cat\ with single cat emoji
  const pattern = /\\cat\\/g;
  let newText = message.replace(pattern, () => {
    return catEmojis[Math.floor(Math.random() * catEmojis.length)];
  });

  // Optionally replace \ccat\ with some variant
  const ccatPattern = /\\ccat\\/g;
  newText = newText.replace(ccatPattern, () => {
    return catEmojis[Math.floor(Math.random() * catEmojis.length)];
  });

  if (target) {
    const pronouns = extractPronounsFromRoles(target);
    const firstPersonPronoun = pronouns[0] || "they";
    const thirdPersonPronoun = pronouns[1] || "them";
    const thirdPersonPossessivePronoun = pronouns[2] || "their";

    // Replace \1stPerson\, \3dPerson\, and \3dPersonPossessive\
    newText = newText.replace(/\\1stPerson\\/g, firstPersonPronoun);
    newText = newText.replace(/\\3dPerson\\/g, thirdPersonPronoun);
    newText = newText.replace(/\\3dPersonPossessive\\/g, thirdPersonPossessivePronoun);
  }

  return newText;
}

/**
 * Extracts pronouns from the target's roles.
 */
function extractPronounsFromRoles(target: GuildMember): string[] {
  const roleNames = target.roles.cache.map(role => role.name.toLowerCase());
  const pronouns = [];

  if (roleNames.includes("it")) pronouns.push("it", "it", "its");
  if (roleNames.includes("they")) pronouns.push("they", "them", "their");
  if (roleNames.includes("she")) pronouns.push("she", "her", "her");
  if (roleNames.includes("he")) pronouns.push("he", "him", "his");

  // Prioritize pronouns: it > they > she > he
  return pronouns.length > 0 ? pronouns : ["they", "them", "their"];
} 