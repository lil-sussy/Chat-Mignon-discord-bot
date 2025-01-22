import { addMonths, addWeeks, addDays, addHours } from 'date-fns';
import { ChatInputCommandInteraction } from 'discord.js';

/**
 * Computes time difference components between two Dates.
 * @param start The earlier Date
 * @param end The later Date
 * @returns An object containing hours, days, weeks, and remainingDays
 */
export function computeTimeDifference(start: Date, end: Date) {
  const timeDiffInMs = end.getTime() - start.getTime();
  const timeDiffInHours = Math.floor(timeDiffInMs / (1000 * 60 * 60));
  const timeDiffInDays = Math.floor(timeDiffInHours / 24);
  const timeDiffInWeeks = Math.floor(timeDiffInDays / 7);
  const remainingDays = timeDiffInDays % 7;

  return { timeDiffInHours, timeDiffInDays, timeDiffInWeeks, remainingDays };
}

/**
 * Applies the given duration (months, weeks, days, hours) to a base date using interaction options.
 * @param baseDate The date that the duration will be added to
 * @param interaction The interaction containing the options
 * @returns The new Date after applying the duration
 */
export function applyDurationToDate(
  baseDate: Date,
  interaction: ChatInputCommandInteraction
): Date {
  const months = parseInt(interaction.options.getString("month") || "0", 10);
  const weeks = parseInt(interaction.options.getString("week") || "0", 10);
  const days = parseInt(interaction.options.getString("day") || "0", 10);
  const hours = parseInt(interaction.options.getString("hours") || "0", 10);

  let result = addMonths(baseDate, months);
  result = addWeeks(result, weeks);
  result = addDays(result, days);
  result = addHours(result, hours);
  return result;
} 