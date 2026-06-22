// Summer Quest — Date Utilities
// Programme week calculation and day-type logic. See spec sections 13.1, 13.2.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Treat dates as plain calendar days (no time component) to avoid
// timezone drift — callers should pass 'YYYY-MM-DD' strings or Date
// objects already normalised to midnight local time.
function toDateOnly(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function differenceInCalendarDays(laterDate, earlierDate) {
  const a = toDateOnly(laterDate);
  const b = toDateOnly(earlierDate);
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export function getProgrammeWeek(date, startDate) {
  const diffDays = differenceInCalendarDays(date, startDate);
  if (diffDays < 0) return 1;
  return Math.min(12, Math.floor(diffDays / 7) + 1);
}

// 0 = Sunday ... 6 = Saturday (JS Date default)
export function getDayType(date) {
  const day = toDateOnly(date).getDay();
  if (day === 0) return 'rest'; // Sunday
  if (day === 6) return 'free_play'; // Saturday
  return 'training'; // Monday-Friday
}

export function formatDateOnly(date) {
  const d = toDateOnly(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function todayDateOnly() {
  return formatDateOnly(new Date());
}
