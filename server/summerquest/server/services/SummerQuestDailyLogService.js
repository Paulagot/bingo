// Summer Quest — Daily Log Service
// Upsert a single day's log for a player. See spec sections 8.2, 13.3.

import { getDayType, getProgrammeWeek } from '../utils/sqDates.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

export class SummerQuestLogLockedError extends Error {}

async function assertWeekNotSignedOff(pool, { playerId, weekNumber }) {
  const [rows] = await pool.execute(
    `SELECT id FROM fundraisely_tt_weekly_signoffs WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  if (rows.length > 0) {
    throw new SummerQuestLogLockedError('This week has already been signed off by a parent and can\u2019t be changed. Ask your parent if something needs fixing.');
  }
}

// A training day counts as complete if at least one activity is done.
// Activity-level progress is still tracked and shown separately — this
// flag is just for streak/dashboard "did they show up today" purposes.
export function isLogComplete(log) {
  return Boolean(
    log.ball_mastery_done || log.passing_done || log.speed_work_done || log.juggling_done
  );
}

export async function upsertDailyLog(pool, { playerId, teamId, logDate, fields }) {
  const dayType = getDayType(logDate);
  const weekNumber = getProgrammeWeek(logDate, PROGRAMME_START_DATE);

  await assertWeekNotSignedOff(pool, { playerId, weekNumber });

  const {
    ballMasteryDone = false,
    ballMasteryMinutes = null,
    passingDone = false,
    passingMinutes = null,
    speedWorkDone = false,
    speedWorkMinutes = null,
    jugglingDone = false,
    jugglingMinutes = null,
    freePlayType = null,
    freePlayMinutes = null,
    restAcknowledged = false,
    effortFeeling = null,
    note = null,
  } = fields;

  await pool.execute(
    `INSERT INTO fundraisely_tt_daily_logs
      (player_id, team_id, log_date, week_number, day_type,
       ball_mastery_done, ball_mastery_minutes,
       passing_done, passing_minutes,
       speed_work_done, speed_work_minutes,
       juggling_done, juggling_minutes,
       free_play_type, free_play_minutes,
       rest_acknowledged, effort_feeling, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       ball_mastery_done = VALUES(ball_mastery_done),
       ball_mastery_minutes = VALUES(ball_mastery_minutes),
       passing_done = VALUES(passing_done),
       passing_minutes = VALUES(passing_minutes),
       speed_work_done = VALUES(speed_work_done),
       speed_work_minutes = VALUES(speed_work_minutes),
       juggling_done = VALUES(juggling_done),
       juggling_minutes = VALUES(juggling_minutes),
       free_play_type = VALUES(free_play_type),
       free_play_minutes = VALUES(free_play_minutes),
       rest_acknowledged = VALUES(rest_acknowledged),
       effort_feeling = VALUES(effort_feeling),
       note = VALUES(note),
       updated_at = NOW()`,
    [
      playerId, teamId, logDate, weekNumber, dayType,
      ballMasteryDone, ballMasteryMinutes,
      passingDone, passingMinutes,
      speedWorkDone, speedWorkMinutes,
      jugglingDone, jugglingMinutes,
      freePlayType, freePlayMinutes,
      restAcknowledged, effortFeeling, note,
    ]
  );

  return getDailyLog(pool, { playerId, logDate });
}

export async function getDailyLog(pool, { playerId, logDate }) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_daily_logs WHERE player_id = ? AND log_date = ? LIMIT 1`,
    [playerId, logDate]
  );
  return rows[0] || null;
}

export async function getLogsForWeek(pool, { playerId, weekNumber }) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_daily_logs WHERE player_id = ? AND week_number = ? ORDER BY log_date ASC`,
    [playerId, weekNumber]
  );
  return rows;
}

export async function getRecentLogs(pool, { playerId, limit = 14 }) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_daily_logs WHERE player_id = ? ORDER BY log_date DESC LIMIT ?`,
    [playerId, limit]
  );
  return rows;
}
