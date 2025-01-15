import { Schema, model } from 'mongoose';

// If your TypeScript config supports path aliases, you might do:
// import { ILogEntry } from '@interfaces/Logger';
// Otherwise, define it inline here:
interface ILogEntry {
  level: 'info' | 'error' | 'warn';
  message: string;
  timestamp?: Date;
  details?: string;
}

// If your TypeScript config supports path aliases, you might do:
// const LogEntryModel = model<ILogEntry>('@models/LogEntry', LogEntrySchema);
// Otherwise, define it directly like so:
const LogEntrySchema = new Schema<ILogEntry>({
  level: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

const LogEntryModel = model<ILogEntry>('LogEntry', LogEntrySchema);

/**
 * Log an informational message, saved to MongoDB
 */
export async function logInfo(message: string, details?: string) {
  await LogEntryModel.create({
    level: 'info',
    message,
    details,
  });
}

/**
 * Log an error message, saved to MongoDB
 */
export async function logError(message: string, details?: string) {
  await LogEntryModel.create({
    level: 'error',
    message,
    details,
  });
} 