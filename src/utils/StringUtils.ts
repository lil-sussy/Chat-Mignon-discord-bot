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