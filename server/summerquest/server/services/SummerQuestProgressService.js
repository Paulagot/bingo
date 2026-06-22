// Summer Quest — Progress Service
// Powers /player/progress (spec section 8.3). Per-activity card data:
// sessions completed, minutes total, this-week count, and a couple of
// activity-specific extras (sprint times, keepy-uppy scores).
// Never compares one child to another — everything here is scoped to
// a single playerId.

import { getProgrammeWeek, todayDateOnly } from '../utils/sqDates.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

const ACTIVITY_COLUMNS = {
  ball_mastery: { done: 'ball_mastery_done', minutes: 'ball_mastery_minutes' },
  passing: { done: 'passing_done', minutes: 'passing_minutes' },
  speed_work: { done: 'speed_work_done', minutes: 'speed_work_minutes' },
  juggling: { done: 'juggling_done', minutes: 'juggling_minutes' },
};

async function getActivityStats(pool, playerId, activityKey, weekNumber) {
  const { done, minutes } = ACTIVITY_COLUMNS[activityKey];

  const [totalsRows] = await pool.execute(
    `SELECT
       COUNT(*) as sessionsCompleted,
       SUM(${minutes}) as minutesTotal
     FROM fundraisely_tt_daily_logs
     WHERE player_id = ? AND ${done} = TRUE`,
    [playerId]
  );

  const [thisWeekRows] = await pool.execute(
    `SELECT COUNT(*) as sessionsThisWeek
     FROM fundraisely_tt_daily_logs
     WHERE player_id = ? AND ${done} = TRUE AND week_number = ?`,
    [playerId, weekNumber]
  );

  return {
    sessionsCompleted: totalsRows[0].sessionsCompleted || 0,
    minutesTotal: totalsRows[0].minutesTotal || 0,
    sessionsThisWeek: thisWeekRows[0].sessionsThisWeek || 0,
  };
}

async function getBenchmarkHistory(pool, playerId, testKey) {
  const [rows] = await pool.execute(
    `SELECT week_number, value, unit FROM fundraisely_tt_benchmark_results
     WHERE player_id = ? AND test_key = ? ORDER BY week_number ASC`,
    [playerId, testKey]
  );
  return rows;
}

function calculateImprovement(history) {
  // Lower is better for sprint times. Returns null if fewer than 2 data points.
  if (history.length < 2) return null;
  const first = Number(history[0].value);
  const latest = Number(history[history.length - 1].value);
  const improvedBy = first - latest; // positive = got faster
  return { firstValue: first, latestValue: latest, improvedBy };
}

async function getKeepyUppyProgress(pool, playerId) {
  const history = await getBenchmarkHistory(pool, playerId, 'keepy_uppy');

  // Also fold in the Week 1 challenge submission, since keepy-uppy is
  // collected there directly as well as potentially as a benchmark.
  const [challengeRows] = await pool.execute(
    `SELECT numeric_value FROM fundraisely_tt_weekly_challenges WHERE player_id = ? AND challenge_key = 'keepy_uppy' LIMIT 1`,
    [playerId]
  );

  const scores = [
    ...history.map((h) => Number(h.value)),
    ...(challengeRows[0]?.numeric_value ? [Number(challengeRows[0].numeric_value)] : []),
  ];

  if (scores.length === 0) return { bestScore: null, latestScore: null };

  return {
    bestScore: Math.max(...scores),
    latestScore: scores[scores.length - 1],
  };
}

export async function getPlayerProgress(pool, { playerId }) {
  const weekNumber = getProgrammeWeek(todayDateOnly(), PROGRAMME_START_DATE);

  const [ballMastery, passing, speedWork, juggling, sprint10History, keepyUppy] = await Promise.all([
    getActivityStats(pool, playerId, 'ball_mastery', weekNumber),
    getActivityStats(pool, playerId, 'passing', weekNumber),
    getActivityStats(pool, playerId, 'speed_work', weekNumber),
    getActivityStats(pool, playerId, 'juggling', weekNumber),
    getBenchmarkHistory(pool, playerId, 'sprint_10m'),
    getKeepyUppyProgress(pool, playerId),
  ]);

  return {
    weekNumber,
    ballMastery: {
      ...ballMastery,
      badgeProgress: { current: ballMastery.sessionsCompleted, target: 10, badgeKey: 'ball_mastery_builder' },
    },
    passing: {
      ...passing,
      badgeProgress: { current: passing.sessionsCompleted, target: 10, badgeKey: 'passing_pro' },
    },
    speedWork: {
      ...speedWork,
      sprint10m: {
        history: sprint10History,
        improvement: calculateImprovement(sprint10History),
      },
      badgeProgress: { current: speedWork.sessionsCompleted, target: 10, badgeKey: 'speed_star' },
    },
    juggling: {
      ...juggling,
      keepyUppy,
      badgeProgress: { current: keepyUppy.bestScore ? 1 : 0, target: 1, badgeKey: 'keepy_uppy_queen' },
    },
  };
}
