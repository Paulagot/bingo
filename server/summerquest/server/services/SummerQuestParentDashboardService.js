// Summer Quest — Parent Dashboard Service
// Quick per-child summary cards for the parent's landing screen.
// See spec section 9 (/parent/dashboard).

import { getPlayersForParent } from './SummerQuestParentPlayerAccessService.js';
import { calculateCurrentStreak } from './SummerQuestStreakService.js';
import { getProgrammeWeek, todayDateOnly } from '../utils/sqDates.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

export async function getParentDashboard(pool, { parentId }) {
  const players = await getPlayersForParent(pool, { parentId });
  const weekNumber = getProgrammeWeek(todayDateOnly(), PROGRAMME_START_DATE);

  const summaries = await Promise.all(
    players.map(async (player) => {
      const [streak, signoff] = await Promise.all([
        calculateCurrentStreak(pool, { playerId: player.id, programmeStartDate: PROGRAMME_START_DATE }),
        getSignoffStatus(pool, player.id, weekNumber),
      ]);
      return {
        id: player.id,
        displayName: player.display_name,
        streak,
        currentWeekSignedOff: Boolean(signoff),
      };
    })
  );

  return { weekNumber, players: summaries };
}

async function getSignoffStatus(pool, playerId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT id FROM fundraisely_tt_weekly_signoffs WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  return rows[0] || null;
}
