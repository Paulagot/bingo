// Summer Quest — Player Dashboard Service
// Aggregates today's log, streak, this week's progress, badges preview,
// and the current weekly challenge for the main dashboard screen.
// See spec section 8.1.

import { getProgrammeWeek, todayDateOnly } from '../utils/sqDates.js';
import { getDailyLog } from './SummerQuestDailyLogService.js';
import { calculateCurrentStreak, calculateWeeklyCompletion } from './SummerQuestStreakService.js';
import { getChallengeForWeek } from '../config/weeklyChallenges.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

export async function getPlayerDashboard(pool, { playerId }) {
  const [playerRows] = await pool.execute(
    `SELECT id, display_name FROM fundraisely_tt_players WHERE id = ? LIMIT 1`,
    [playerId]
  );
  const player = playerRows[0];
  if (!player) return null;

  const today = todayDateOnly();
  const weekNumber = getProgrammeWeek(today, PROGRAMME_START_DATE);

  const [todayLog, streak, weeklyCompletion, badgeCount, challengeRow] = await Promise.all([
    getDailyLog(pool, { playerId, logDate: today }),
    calculateCurrentStreak(pool, { playerId, programmeStartDate: PROGRAMME_START_DATE }),
    calculateWeeklyCompletion(pool, { playerId, weekNumber }),
    getBadgeCount(pool, playerId),
    getChallengeSubmissionForWeek(pool, playerId, weekNumber),
  ]);

  const challengeConfig = getChallengeForWeek(weekNumber);

  return {
    player: { id: player.id, displayName: player.display_name },
    today: { date: today, log: todayLog },
    weekNumber,
    streak,
    weeklyCompletion,
    badgeCount,
    weeklyChallenge: challengeConfig
      ? { ...challengeConfig, submitted: Boolean(challengeRow), submission: challengeRow || null }
      : null,
  };
}

async function getBadgeCount(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_player_badges WHERE player_id = ?`,
    [playerId]
  );
  return rows[0].count;
}

async function getChallengeSubmissionForWeek(pool, playerId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_weekly_challenges WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  return rows[0] || null;
}
