// Summer Quest — Streak Service
// See spec section 13.4. Walks backwards from today:
//   - completed training/free-play day -> counts, keep walking
//   - Sunday -> neutral, skip, keep walking
//   - missed weekday -> streak ends
//   - future days never considered (we always start from "today")

import { getDayType, formatDateOnly, differenceInCalendarDays } from '../utils/sqDates.js';
import { isLogComplete } from './SummerQuestDailyLogService.js';

export async function calculateCurrentStreak(pool, { playerId, programmeStartDate }) {
  const today = new Date();
  const logsByDate = await getLogMapForStreakWindow(pool, { playerId });

  let streak = 0;
  let cursor = new Date(today);

  // Walk backwards day by day until we hit a break or go before the
  // programme start date.
  while (differenceInCalendarDays(cursor, programmeStartDate) >= 0) {
    const dateKey = formatDateOnly(cursor);
    const dayType = getDayType(cursor);

    if (dayType === 'rest') {
      // Sunday — neutral, does not break or extend the streak.
      cursor = addDays(cursor, -1);
      continue;
    }

    const log = logsByDate.get(dateKey);
    const completed = dayType === 'free_play'
      ? Boolean(log && (log.free_play_type || log.free_play_minutes))
      : Boolean(log && isLogComplete(log));

    // Today is special-cased: if it's not logged yet, don't break the
    // streak just because the day isn't over — just don't count it yet.
    const isToday = dateKey === formatDateOnly(today);
    if (!completed && isToday) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (!completed) break;

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function getLogMapForStreakWindow(pool, { playerId }) {
  // Cap the lookback window at 60 days for performance — more than
  // enough for a 12-week summer programme.
  const [rows] = await pool.execute(
    `SELECT log_date, ball_mastery_done, passing_done, speed_work_done, juggling_done,
            free_play_type, free_play_minutes
     FROM fundraisely_tt_daily_logs
     WHERE player_id = ?
     ORDER BY log_date DESC
     LIMIT 60`,
    [playerId]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(formatDateOnly(row.log_date), row);
  }
  return map;
}

export async function calculateWeeklyCompletion(pool, { playerId, weekNumber }) {
  const [rows] = await pool.execute(
    `SELECT day_type, ball_mastery_done, passing_done, speed_work_done, juggling_done
     FROM fundraisely_tt_daily_logs
     WHERE player_id = ? AND week_number = ? AND day_type = 'training'`,
    [playerId, weekNumber]
  );

  const completedDays = rows.filter((row) => isLogComplete(row)).length;
  return { completedDays, targetDays: 5 };
}
