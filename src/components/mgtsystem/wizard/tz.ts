// src/components/mgtsystem/wizard/tz.ts
//
// Timezone conversion helpers, moved VERBATIM from
// ScheduleTicketedEventModal.tsx so the wizard's registry createRoom and
// the edit-mode modal wrappers share one implementation. Ticket-type
// sale deadlines are entered in the EVENT's timezone and stored as UTC.

/**
 * Convert a local datetime string (e.g. "2026-07-01T23:59") in a given
 * IANA timezone to a UTC ISO string for storage.
 */
export function localToUtc(localDatetime: string, timeZone: string): string | null {
  if (!localDatetime) return null;
  try {
    const tIdx     = localDatetime.indexOf('T');
    const datePart = tIdx >= 0 ? localDatetime.slice(0, tIdx) : localDatetime;
    const timePart = tIdx >= 0 ? localDatetime.slice(tIdx + 1) : '23:59';

    const dateParts = datePart.split('-').map(Number);
    const timeParts = timePart.split(':').map(Number);

    const year   = dateParts[0] ?? 0;
    const month  = dateParts[1] ?? 1;
    const day    = dateParts[2] ?? 1;
    const hour   = timeParts[0] ?? 23;
    const minute = timeParts[1] ?? 59;

    // Build a UTC Date from the naive local values
    const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // Use Intl to find what the formatter thinks the local time is for this UTC instant
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    const p: Record<string, number> = {};
    for (const part of formatter.formatToParts(naiveUtc)) {
      if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
    }

    const pYear   = p['year']   ?? year;
    const pMonth  = p['month']  ?? month;
    const pDay    = p['day']    ?? day;
    const pHour   = p['hour']   ?? hour;
    const pMinute = p['minute'] ?? minute;
    const pSecond = p['second'] ?? 0;

    const localAsUTC = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMinute, pSecond);
    const offsetMs   = localAsUTC - naiveUtc.getTime();
    const trueUtc    = new Date(naiveUtc.getTime() - offsetMs);

    return trueUtc.toISOString();
  } catch {
    return null;
  }
}

/**
 * Convert a UTC ISO string back to a local datetime-local input value
 * in the given IANA timezone (for pre-filling in edit mode).
 */
export function utcToLocalInputTz(utcIso: string, timeZone: string): string {
  if (!utcIso) return '';
  try {
    const date = new Date(utcIso);
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    });
    // sv-SE gives "YYYY-MM-DD HH:MM" — replace space with T
    return formatter.format(date).replace(' ', 'T');
  } catch {
    return '';
  }
}