/**
 * Format a date string (e.g. "2026-02-15" or "2026-02-15T05:00:00.000Z") for display.
 * Returns the localized date string, or the fallback if the input is null/undefined.
 */
export function formatDate(dateStr: string | null | undefined, fallback = 'N/A'): string {
  if (!dateStr) return fallback;
  const dateOnly = String(dateStr).split('T')[0];
  return new Date(dateOnly + 'T00:00:00').toLocaleDateString();
}

/**
 * Get today's date as a YYYY-MM-DD string (for date inputs and API calls).
 */
export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Extract the date portion (YYYY-MM-DD) from an ISO date string.
 */
export function toDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return String(dateStr).split('T')[0];
}
