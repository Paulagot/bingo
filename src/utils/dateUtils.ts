// src/utils/dateUtils.ts
//
// ─── TIMEZONE UTILITIES ───────────────────────────────────────────────────────
//
// The golden rule across this codebase:
//   • The DB stores ALL datetimes in UTC  (e.g. "2025-06-07T18:00:00.000Z")
//   • The UI always converts UTC → local timezone before displaying
//   • The UI always converts local → UTC before sending to the backend
//
// Use these helpers everywhere instead of calling new Date() directly on a
// datetime string, because:
//   new Date("2025-06-07T18:00:00.000Z")   ← correct, has Z = UTC
//   new Date("2025-06-07T18:00:00")        ← WRONG, no Z, browser treats as LOCAL
//
// If you have old data in the DB without a Z suffix, utcToLocalDisplay() handles
// it gracefully by treating it as UTC anyway.

/**
 * Detect the browser's current IANA timezone string.
 * e.g. "Europe/Dublin"
 */
export function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a UTC datetime string from the DB into a human-readable LOCAL date string.
 *
 * @param value    - UTC string from DB, e.g. "2025-06-07T18:00:00.000Z"
 * @param timeZone - IANA timezone, e.g. "Europe/Dublin". Defaults to browser timezone.
 * @returns        - e.g. "7 Jun 2025"
 */
export function utcToLocalDate(
  value: string | null | undefined,
  timeZone: string = detectTimezone(),
): string {
  if (!value) return '—';
  // Ensure the string is treated as UTC even if it lacks a Z suffix
  const normalized = value.endsWith('Z') || value.includes('+') ? value : `${value}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone,
  });
}

/**
 * Convert a UTC datetime string from the DB into a human-readable LOCAL time string.
 *
 * @param value    - UTC string from DB, e.g. "2025-06-07T18:00:00.000Z"
 * @param timeZone - IANA timezone, e.g. "Europe/Dublin". Defaults to browser timezone.
 * @returns        - e.g. "19:00"
 */
export function utcToLocalTime(
  value: string | null | undefined,
  timeZone: string = detectTimezone(),
): string {
  if (!value) return '';
  const normalized = value.endsWith('Z') || value.includes('+') ? value : `${value}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone,
  });
}

/**
 * Convert a UTC datetime string into a full date+time object for display.
 * Used by OverviewTab and similar components.
 *
 * @param value    - UTC string from DB
 * @param timeZone - IANA timezone. Defaults to browser timezone.
 * @returns        - { date, time, compact } all in local time
 */
export function utcToLocalDateTime(
  value: string | null | undefined,
  timeZone: string = detectTimezone(),
): { date: string; time: string; compact: string } {
  const empty = { date: 'Not scheduled', time: '', compact: 'Not scheduled' };
  if (!value) return empty;
  const normalized = value.endsWith('Z') || value.includes('+') ? value : `${value}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return empty;
  const date = d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone,
  });
  return { date, time, compact: `${date} at ${time}` };
}

/**
 * Convert a UTC datetime string into "YYYY-MM-DDTHH:MM" for a datetime-local input,
 * expressed in the given local timezone.
 *
 * Used when loading an existing event into the CreateEventForm edit mode.
 *
 * @param utcString  - UTC string from DB, e.g. "2025-06-07T18:00:00.000Z"
 * @param timeZone   - IANA timezone, e.g. "Europe/Dublin"
 * @returns          - e.g. "2025-06-07T19:00"
 */
export function utcToLocalInput(utcString: string, timeZone: string): string {
  if (!utcString) return '';
  const normalized = utcString.endsWith('Z') || utcString.includes('+') ? utcString : `${utcString}Z`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Convert a "YYYY-MM-DDTHH:MM" string from a datetime-local input
 * (which the browser treats as LOCAL time) into a UTC ISO string for the backend.
 *
 * Used in CreateEventForm handleSubmit before sending to the API.
 *
 * @param localDateTimeStr - e.g. "2025-06-07T19:00" (local Dublin time)
 * @returns                - e.g. "2025-06-07T18:00:00.000Z" (UTC)
 */
export function localInputToUTC(localDateTimeStr: string): string {
  if (!localDateTimeStr) return '';
  // new Date("YYYY-MM-DDTHH:MM") — no Z/offset — browser parses as LOCAL time
  // .toISOString() then outputs the correct UTC equivalent
  return new Date(localDateTimeStr).toISOString();
}

/**
 * Display an event date/time info bar string — used in schedule modals.
 * Shows the local date for the given UTC string.
 *
 * @param utcString  - UTC string from DB
 * @param timeZone   - IANA timezone
 * @returns          - e.g. "Saturday, 7 June 2025"
 */
export function utcToLocalDateLong(
  utcString: string | null | undefined,
  timeZone: string = detectTimezone(),
): string {
  if (!utcString) return 'No date set on event';
  const normalized = utcString.endsWith('Z') || utcString.includes('+') ? utcString : `${utcString}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return 'No date set on event';
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
  });
}