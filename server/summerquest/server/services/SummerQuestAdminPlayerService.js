// Summer Quest — Admin Player Service
// Coach/admin can see every player's progress, but per spec section 18:
// never return player_code_hash or password_hash, and coach cannot edit
// child logs unless explicitly enabled (not built — out of MVP scope,
// flagged in README).

import { getProgrammeWeek, todayDateOnly } from '../utils/sqDates.js';
import { calculateCurrentStreak } from './SummerQuestStreakService.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

export async function getAdminPlayerTable(pool, { teamId }) {
  const weekNumber = getProgrammeWeek(todayDateOnly(), PROGRAMME_START_DATE);

  const [players] = await pool.execute(
    `SELECT p.id, p.display_name, pr.name as parent_name, p.created_at, p.is_active
     FROM fundraisely_tt_players p
     JOIN fundraisely_tt_parents pr ON pr.id = p.parent_id
     WHERE p.team_id = ?
     ORDER BY p.display_name ASC`,
    [teamId]
  );

  const rows = await Promise.all(
    players.map(async (player) => {
      const [streak, weekCompletion, challengeSubmitted, signoff, badgeCount, lastActive] = await Promise.all([
        calculateCurrentStreak(pool, { playerId: player.id, programmeStartDate: PROGRAMME_START_DATE }),
        getWeekCompletion(pool, player.id, weekNumber),
        hasChallengeThisWeek(pool, player.id, weekNumber),
        hasSignoffThisWeek(pool, player.id, weekNumber),
        getBadgeCount(pool, player.id),
        getLastActiveDate(pool, player.id),
      ]);

      return {
        id: player.id,
        displayName: player.display_name,
        parentName: player.parent_name,
        isActive: player.is_active,
        thisWeekCompletion: weekCompletion,
        currentStreak: streak,
        challengeSubmitted,
        parentSigned: signoff,
        lastActive,
        badgeCount,
      };
    })
  );

  return { weekNumber, players: rows };
}

async function getWeekCompletion(pool, playerId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as completedDays FROM fundraisely_tt_daily_logs
     WHERE player_id = ? AND week_number = ? AND day_type = 'training'
       AND (ball_mastery_done = TRUE OR passing_done = TRUE OR speed_work_done = TRUE OR juggling_done = TRUE)`,
    [playerId, weekNumber]
  );
  return { completedDays: rows[0].completedDays, targetDays: 5 };
}

async function hasChallengeThisWeek(pool, playerId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_weekly_challenges WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  return rows.length > 0;
}

async function hasSignoffThisWeek(pool, playerId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_weekly_signoffs WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  return rows.length > 0;
}

async function getBadgeCount(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_player_badges WHERE player_id = ?`,
    [playerId]
  );
  return rows[0].count;
}

async function getLastActiveDate(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT log_date FROM fundraisely_tt_daily_logs WHERE player_id = ? ORDER BY log_date DESC LIMIT 1`,
    [playerId]
  );
  return rows[0]?.log_date || null;
}

export async function getAdminPlayerDetail(pool, { teamId, playerId }) {
  const [playerRows] = await pool.execute(
    `SELECT p.id, p.display_name, p.internal_name, p.squad, p.is_active, p.created_at,
            pr.id as parent_id, pr.name as parent_name, pr.email as parent_email
     FROM fundraisely_tt_players p
     JOIN fundraisely_tt_parents pr ON pr.id = p.parent_id
     WHERE p.id = ? AND p.team_id = ?
     LIMIT 1`,
    [playerId, teamId]
  );
  const player = playerRows[0];
  if (!player) return null;

  const [logs, challenges, signoffs, badges] = await Promise.all([
    pool.execute(`SELECT * FROM fundraisely_tt_daily_logs WHERE player_id = ? ORDER BY log_date ASC`, [playerId]),
    pool.execute(`SELECT * FROM fundraisely_tt_weekly_challenges WHERE player_id = ? ORDER BY week_number ASC`, [playerId]),
    pool.execute(`SELECT * FROM fundraisely_tt_weekly_signoffs WHERE player_id = ? ORDER BY week_number ASC`, [playerId]),
    pool.execute(
      `SELECT pb.badge_key, pb.unlocked_at, b.name, b.icon, b.colour
       FROM fundraisely_tt_player_badges pb JOIN fundraisely_tt_badges b ON b.badge_key = pb.badge_key
       WHERE pb.player_id = ? ORDER BY pb.unlocked_at ASC`,
      [playerId]
    ),
  ]);

  return {
    player: {
      id: player.id,
      displayName: player.display_name,
      internalName: player.internal_name,
      squad: player.squad,
      isActive: player.is_active,
      createdAt: player.created_at,
      parent: { id: player.parent_id, name: player.parent_name, email: player.parent_email },
    },
    dailyLogs: logs[0],
    weeklyChallenges: challenges[0],
    weeklySignoffs: signoffs[0],
    badges: badges[0],
  };
}
