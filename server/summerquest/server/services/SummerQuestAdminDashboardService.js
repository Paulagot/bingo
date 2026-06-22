// Summer Quest — Admin Dashboard Service
// See spec section 8.10. Squad-wide counts only here — per-player
// detail lives in SummerQuestAdminPlayerService.js.

import { getProgrammeWeek, todayDateOnly } from '../utils/sqDates.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

export async function getAdminDashboardSummary(pool, { teamId }) {
  const weekNumber = getProgrammeWeek(todayDateOnly(), PROGRAMME_START_DATE);

  const [
    totalPlayersRows,
    activeThisWeekRows,
    logsThisWeekRows,
    challengesThisWeekRows,
    signoffsCompletedRows,
    needingSignoffRows,
    totalSessionsRows,
  ] = await Promise.all([
    pool.execute(`SELECT COUNT(*) as count FROM fundraisely_tt_players WHERE team_id = ? AND is_active = TRUE`, [teamId]),
    pool.execute(
      `SELECT COUNT(DISTINCT player_id) as count FROM fundraisely_tt_daily_logs WHERE team_id = ? AND week_number = ?`,
      [teamId, weekNumber]
    ),
    pool.execute(`SELECT COUNT(*) as count FROM fundraisely_tt_daily_logs WHERE team_id = ? AND week_number = ?`, [teamId, weekNumber]),
    pool.execute(
      `SELECT COUNT(*) as count FROM fundraisely_tt_weekly_challenges WHERE team_id = ? AND week_number = ?`,
      [teamId, weekNumber]
    ),
    pool.execute(
      `SELECT COUNT(*) as count FROM fundraisely_tt_weekly_signoffs WHERE team_id = ? AND week_number = ?`,
      [teamId, weekNumber]
    ),
    pool.execute(
      `SELECT COUNT(*) as count FROM fundraisely_tt_players p
       WHERE p.team_id = ? AND p.is_active = TRUE
         AND p.id NOT IN (
           SELECT player_id FROM fundraisely_tt_weekly_signoffs WHERE team_id = ? AND week_number = ?
         )`,
      [teamId, teamId, weekNumber]
    ),
    pool.execute(
      `SELECT
         SUM((ball_mastery_done = TRUE) + (passing_done = TRUE) + (speed_work_done = TRUE) + (juggling_done = TRUE)) as totalSessions,
         SUM(COALESCE(ball_mastery_minutes,0)+COALESCE(passing_minutes,0)+COALESCE(speed_work_minutes,0)+COALESCE(juggling_minutes,0)+COALESCE(free_play_minutes,0)) as totalMinutes
       FROM fundraisely_tt_daily_logs WHERE team_id = ?`,
      [teamId]
    ),
  ]);

  return {
    currentWeek: weekNumber,
    totalPlayers: totalPlayersRows[0][0].count,
    activeThisWeek: activeThisWeekRows[0][0].count,
    logsSubmittedThisWeek: logsThisWeekRows[0][0].count,
    challengeSubmissionsThisWeek: challengesThisWeekRows[0][0].count,
    parentSignoffsCompleted: signoffsCompletedRows[0][0].count,
    playersNeedingSignoff: needingSignoffRows[0][0].count,
    totalSessions: Number(totalSessionsRows[0][0].totalSessions) || 0,
    totalOptionalMinutes: Number(totalSessionsRows[0][0].totalMinutes) || 0,
  };
}
