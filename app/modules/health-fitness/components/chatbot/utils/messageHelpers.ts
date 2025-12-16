/**
 * Message Helper Utilities
 * Provides ID generation and timestamp formatting without external dependencies
 */

let messageCounter = 0;

/**
 * Generate unique message ID using timestamp + counter
 * @returns Unique message ID string
 */
export const generateMessageId = (): string => {
  const timestamp = Date.now();
  messageCounter = (messageCounter + 1) % 1000;
  return `${timestamp}-${messageCounter}`;
};

/**
 * Format date to readable timestamp
 * @param date - Date object to format
 * @returns Formatted time string (HH:MM AM/PM)
 */
export const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
