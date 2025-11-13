/**
 * Formatting Utilities
 */

export interface FormattedEventDateTime {
  date: string;
  time: string;
}

/**
 * Format event date/time for display
 */
export function formatEventDateTime(dateTime?: string): FormattedEventDateTime | null {
  if (!dateTime) return null;
  const date = new Date(dateTime);
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

