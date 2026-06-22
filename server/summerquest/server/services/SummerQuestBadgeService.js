// Summer Quest — Badge Unlock Service
// See spec section 13.5. Call checkAndUnlockBadges after a daily log
// save or challenge submission. Returns only the NEWLY unlocked badges
// so the frontend can show a celebration modal.

import { calculateCurrentStreak } from './SummerQuestStreakService.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

async function alreadyUnlocked(pool, playerId, badgeKey) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_player_badges WHERE player_id = ? AND badge_key = ? LIMIT 1`,
    [playerId, badgeKey]
  );
  return rows.length > 0;
}

async function unlock(pool, playerId, badgeKey) {
  // INSERT IGNORE so a race between two near-simultaneous checks never
  // throws on the UNIQUE constraint.
  await pool.execute(
    `INSERT IGNORE INTO fundraisely_tt_player_badges (player_id, badge_key) VALUES (?, ?)`,
    [playerId, badgeKey]
  );
}

async function countActivitySessions(pool, playerId, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM fundraisely_tt_daily_logs WHERE player_id = ? AND ${column} = TRUE`,
    [playerId]
  );
  return rows[0].count;
}

async function hasFullWeekHero(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT week_number, COUNT(*) as completedDays
     FROM fundraisely_tt_daily_logs
     WHERE player_id = ? AND day_type = 'training'
       AND (ball_mastery_done = TRUE OR passing_done = TRUE OR speed_work_done = TRUE OR juggling_done = TRUE)
     GROUP BY week_number
     HAVING completedDays >= 5
     LIMIT 1`,
    [playerId]
  );
  return rows.length > 0;
}

async function hasComebackPlayer(pool, playerId) {
  // Look at the last 30 logged days in order; if any completed training
  // day is immediately preceded (by calendar date, not log row) by a
  // missing weekday, that's a comeback. Simplified check: look for a
  // gap of >1 calendar day between two consecutive training logs.
  const [rows] = await pool.execute(
    `SELECT log_date FROM fundraisely_tt_daily_logs
     WHERE player_id = ? AND day_type = 'training'
       AND (ball_mastery_done = TRUE OR passing_done = TRUE OR speed_work_done = TRUE OR juggling_done = TRUE)
     ORDER BY log_date ASC`,
    [playerId]
  );

  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].log_date);
    const curr = new Date(rows[i].log_date);
    const gapDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
    // gapDays > 1 means at least one weekday was skipped in between
    // (Sunday gaps of exactly 2 calendar days between Fri and Sat/Mon
    // are normal and not a "miss" — this is a simple heuristic, not
    // perfect, good enough for a fun badge rather than a strict audit).
    if (gapDays > 1 && gapDays <= 4) return true;
  }
  return false;
}

async function hasChallengeSubmission(pool, playerId, weekNumber) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_weekly_challenges WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  return rows.length > 0;
}

async function hasAnyTrainingLog(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_daily_logs
     WHERE player_id = ?
       AND (ball_mastery_done = TRUE OR passing_done = TRUE OR speed_work_done = TRUE OR juggling_done = TRUE)
     LIMIT 1`,
    [playerId]
  );
  return rows.length > 0;
}

async function hasSaturdayLog(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_daily_logs WHERE player_id = ? AND day_type = 'free_play' LIMIT 1`,
    [playerId]
  );
  return rows.length > 0;
}

async function hasSpeedBenchmark(pool, playerId) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM fundraisely_tt_benchmark_results WHERE player_id = ? AND test_key LIKE 'sprint_%' LIMIT 1`,
    [playerId]
  );
  return rows.length > 0;
}

// The badge rule set. Each rule is a small async predicate. Kept as a
// list (not a switch) so adding/removing a badge later is a one-line
// change rather than touching control flow.
const BADGE_RULES = [
  {
    key: 'first_mission',
    check: (pool, playerId) => hasAnyTrainingLog(pool, playerId),
  },
  {
    key: 'three_day_streak',
    check: async (pool, playerId) => {
      const streak = await calculateCurrentStreak(pool, { playerId, programmeStartDate: PROGRAMME_START_DATE });
      return streak >= 3;
    },
  },
  {
    key: 'full_week_hero',
    check: (pool, playerId) => hasFullWeekHero(pool, playerId),
  },
  {
    key: 'comeback_player',
    check: (pool, playerId) => hasComebackPlayer(pool, playerId),
  },
  {
    key: 'ball_mastery_builder',
    check: async (pool, playerId) => (await countActivitySessions(pool, playerId, 'ball_mastery_done')) >= 10,
  },
  {
    key: 'passing_pro',
    check: async (pool, playerId) => (await countActivitySessions(pool, playerId, 'passing_done')) >= 10,
  },
  {
    key: 'speed_star',
    check: async (pool, playerId) => {
      const sessions = await countActivitySessions(pool, playerId, 'speed_work_done');
      if (sessions >= 10) return true;
      return hasSpeedBenchmark(pool, playerId);
    },
  },
  {
    key: 'keepy_uppy_queen',
    check: (pool, playerId) => hasChallengeSubmission(pool, playerId, 1),
  },
  {
    key: 'weak_foot_warrior',
    check: (pool, playerId) => hasChallengeSubmission(pool, playerId, 5),
  },
  {
    key: 'halfway_hero',
    check: (pool, playerId) => hasChallengeSubmission(pool, playerId, 8),
  },
  {
    key: 'skills_showcaser',
    check: (pool, playerId) => hasChallengeSubmission(pool, playerId, 11),
  },
  {
    key: 'summer_finisher',
    check: (pool, playerId) => hasChallengeSubmission(pool, playerId, 12),
  },
  {
    key: 'team_player',
    check: (pool, playerId) => hasSaturdayLog(pool, playerId),
  },
  // 'hydration_hero' is unlocked explicitly from the nutrition page
  // route, not checked here — see SummerQuestNutritionService.js.
];

export async function checkAndUnlockBadges(pool, { playerId }) {
  const newlyUnlocked = [];

  for (const rule of BADGE_RULES) {
    if (await alreadyUnlocked(pool, playerId, rule.key)) continue;

    const earned = await rule.check(pool, playerId);
    if (earned) {
      await unlock(pool, playerId, rule.key);
      newlyUnlocked.push(rule.key);
    }
  }

  return newlyUnlocked;
}
