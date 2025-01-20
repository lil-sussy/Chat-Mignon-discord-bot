/**
 * Crops a string to a specified length and appends ellipses if it exceeds that length.
 * 
 * @param input - The string to crop.
 * @param maxLength - The maximum allowed length of the string.
 * @returns The cropped string with ellipses if it was longer than maxLength.
 */
export function cropStringWithEllipses(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  return input.substring(0, maxLength - 3) + '...';
} 

export const formatDate = (date: Date) => {
	let hours = date.getHours();
	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const dayOfWeek = date.toLocaleString("en-US", { weekday: "short" });
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	return `${hours}${ampm} on ${dayOfWeek} ${day}/${month}`;
};