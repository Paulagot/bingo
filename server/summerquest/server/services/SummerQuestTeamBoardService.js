// Summer Quest — Team Board Service
// Player-facing aggregate stats. NEVER returns individual names,
// rankings, or anything that could single out a specific child.
// See spec sections 8.7 and 13.6.
//
// The admin-facing Team Board (more detail, still no public rankings)
// is a separate function at the bottom of this file — it's used by the
// coach dashboard, not the player app.

import { getProgrammeWeek, todayDateOnly } from '../utils/sqDates.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

async function getActivePlayerCount(pool, teamId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_players WHERE team_id = ? AND is_active = TRUE`,
    [teamId]
  );
  return rows[0].count;
}

async function getActiveThisWeekCount(pool, teamId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT COUNT(DISTINCT player_id) as count
     FROM fundraisely_tt_daily_logs
     WHERE team_id = ? AND week_number = ?`,
    [teamId, weekNumber]
  );
  return rows[0].count;
}

async function getTotalSessionsAndMinutes(pool, teamId) {
  const [rows] = await pool.execute(
    `SELECT
       SUM(
         CAST(ball_mastery_done AS UNSIGNED) + CAST(passing_done AS UNSIGNED) +
         CAST(speed_work_done AS UNSIGNED) + CAST(juggling_done AS UNSIGNED)
       ) as totalSessions,
       SUM(
         COALESCE(ball_mastery_minutes, 0) + COALESCE(passing_minutes, 0) +
         COALESCE(speed_work_minutes, 0) + COALESCE(juggling_minutes, 0) +
         COALESCE(free_play_minutes, 0)
       ) as totalMinutes
     FROM fundraisely_tt_daily_logs
     WHERE team_id = ?`,
    [teamId]
  );
  return {
    totalSessions: Number(rows[0].totalSessions) || 0,
    totalMinutes: Number(rows[0].totalMinutes) || 0,
  };
}

async function getChallengesSubmittedThisWeek(pool, teamId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_weekly_challenges WHERE team_id = ? AND week_number = ?`,
    [teamId, weekNumber]
  );
  return rows[0].count;
}

async function getSignoffsThisWeek(pool, teamId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_weekly_signoffs WHERE team_id = ? AND week_number = ?`,
    [teamId, weekNumber]
  );
  return rows[0].count;
}

async function getWeeklyGoalProgress(pool, teamId, weekNumber, activePlayerCount) {
  // Goal: each active player completes 5 training days this week.
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as completedTrainingDays
     FROM fundraisely_tt_daily_logs
     WHERE team_id = ? AND week_number = ? AND day_type = 'training'
       AND (ball_mastery_done = TRUE OR passing_done = TRUE OR speed_work_done = TRUE OR juggling_done = TRUE)`,
    [teamId, weekNumber]
  );

  const teamGoal = activePlayerCount * 5;
  const completedTrainingDays = rows[0].completedTrainingDays;
  const goalProgress = teamGoal > 0 ? Math.min(1, completedTrainingDays / teamGoal) : 0;

  return { teamGoal, completedTrainingDays, goalProgress };
}

// Anonymous milestones — counts only, never names. See spec 8.7.
async function getAnonymousMilestones(pool, teamId, weekNumber) {
  const [fullWeekHeroes] = await pool.execute(
    `SELECT COUNT(DISTINCT player_id) as count
     FROM (
       SELECT player_id, week_number, COUNT(*) as completedDays
       FROM fundraisely_tt_daily_logs
       WHERE team_id = ? AND day_type = 'training'
         AND (ball_mastery_done = TRUE OR passing_done = TRUE OR speed_work_done = TRUE OR juggling_done = TRUE)
       GROUP BY player_id, week_number
       HAVING completedDays >= 5
     ) as weekly_completions`,
    [teamId]
  );

  const [threeDayStreaks] = await pool.execute(
    `SELECT COUNT(DISTINCT player_id) as count
     FROM fundraisely_tt_player_badges
     WHERE badge_key = 'three_day_streak'
       AND player_id IN (SELECT id FROM fundraisely_tt_players WHERE team_id = ?)`,
    [teamId]
  );

  const [currentWeekChallengeSubmissions] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_weekly_challenges WHERE team_id = ? AND week_number = ?`,
    [teamId, weekNumber]
  );

  const [newBadgesThisWeek] = await pool.execute(
    `SELECT COUNT(*) as count
     FROM fundraisely_tt_player_badges pb
     JOIN fundraisely_tt_players p ON p.id = pb.player_id
     WHERE p.team_id = ? AND pb.unlocked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [teamId]
  );

  const milestones = [];
  if (fullWeekHeroes[0].count > 0) {
    milestones.push(`${fullWeekHeroes[0].count} ${pluralPlayers(fullWeekHeroes[0].count)} unlocked Full Week Hero`);
  }
  if (threeDayStreaks[0].count > 0) {
    milestones.push(`${threeDayStreaks[0].count} ${pluralPlayers(threeDayStreaks[0].count)} hit a 3-day streak`);
  }
  if (currentWeekChallengeSubmissions[0].count > 0) {
    milestones.push(`${currentWeekChallengeSubmissions[0].count} weekly challenges submitted so far this week`);
  }
  if (newBadgesThisWeek[0].count > 0) {
    milestones.push(`${newBadgesThisWeek[0].count} new badges unlocked this week`);
  }

  return milestones;
}

function pluralPlayers(count) {
  return count === 1 ? 'player' : 'players';
}

// ── Player-facing Team Board ─────────────────────────────────────────
export async function getPlayerFacingTeamBoard(pool, { teamId }) {
  const weekNumber = getProgrammeWeek(todayDateOnly(), PROGRAMME_START_DATE);
  const activePlayerCount = await getActivePlayerCount(pool, teamId);

  const [activeThisWeek, totals, challengesThisWeek, signoffsThisWeek, goalProgress, milestones] = await Promise.all([
    getActiveThisWeekCount(pool, teamId, weekNumber),
    getTotalSessionsAndMinutes(pool, teamId),
    getChallengesSubmittedThisWeek(pool, teamId, weekNumber),
    getSignoffsThisWeek(pool, teamId, weekNumber),
    getWeeklyGoalProgress(pool, teamId, weekNumber, activePlayerCount),
    getAnonymousMilestones(pool, teamId, weekNumber),
  ]);

  return {
    weekNumber,
    totalSessionsCompleted: totals.totalSessions,
    totalMinutesPractised: totals.totalMinutes,
    activePlayersThisWeek: activeThisWeek,
    weeklyChallengesSubmitted: challengesThisWeek,
    parentSignoffsCompleted: signoffsThisWeek,
    teamGoal: goalProgress.teamGoal,
    goalProgressThisWeek: goalProgress.goalProgress,
    anonymousMilestones: milestones,
  };
}

// ── Coach/admin Team Board ────────────────────────────────────────────
// Slightly more detail (e.g. raw counts without the "anonymous phrasing"
// wrapper), but still no individual rankings — coach gets per-player
// detail through the separate admin player table/detail endpoints
// instead (Phase 7), not through this aggregate view.
export async function getAdminFacingTeamBoard(pool, { teamId }) {
  const board = await getPlayerFacingTeamBoard(pool, { teamId });
  const activePlayerCount = await getActivePlayerCount(pool, teamId);
  return { ...board, totalActivePlayers: activePlayerCount };
}
