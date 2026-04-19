/**
 * Challenge Service
 * server/puzzles/services/challengeService.js
 *
 * PUZZLE_WEEK_DURATION_SECONDS env var controls week interval.
 * Default: 604800 (7 days). Set to 120 for 2-minute test intervals.
 * Note: unlocks_at is written at challenge creation time — changing the
 * env var only affects newly created challenges, not existing ones.
 */

import database from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// ─── Week duration helper ─────────────────────────────────────────────────────
// Read once at module load — server restart required to pick up changes.

function getWeekMs() {
  const seconds = parseInt(process.env.PUZZLE_WEEK_DURATION_SECONDS ?? '604800', 10);
  return seconds * 1000;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createChallenge({
  clubId,
  title,
  description,
  totalWeeks,
  startsAt,
  puzzleSchedule,
  isFree,
  weeklyPrice,
  currency,
}) {
  if (!isFree && !weeklyPrice) {
    throw new Error('weeklyPrice is required for paid challenges');
  }

  const id              = uuidv4();
  const priceInCents    = isFree ? null : Math.round(weeklyPrice);
  const resolvedCurrency = currency ?? 'eur';
  const weekMs          = getWeekMs();

  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_challenges
       (id, club_id, title, description, total_weeks, starts_at, status,
        weekly_price, currency, platform_fee_percent, is_free)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, ?)`,
    [
      id, clubId, title, description ?? null, totalWeeks, startsAt,
      priceInCents, resolvedCurrency, isFree ? 1 : 0,
    ]
  );

  // Insert schedule rows
  if (puzzleSchedule?.length) {
    const startsAtMs = new Date(startsAt).getTime();

    for (const entry of puzzleSchedule) {
      // unlocks_at = challenge start + (week - 1) * weekMs
      const unlocksAt = new Date(startsAtMs + (entry.week - 1) * weekMs);

      await database.connection.execute(
        `INSERT INTO fundraisely_puzzle_schedule
           (challenge_id, club_id, week_number, puzzle_type, difficulty, unlocks_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          clubId,
          entry.week,
          entry.puzzleType,
          entry.difficulty ?? 'medium',
          unlocksAt.toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
    }
  }

  return getChallengeById({ challengeId: id, clubId });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getChallengesByClub({ clubId }) {
  const [rows] = await database.connection.execute(
    `SELECT
       c.id, c.title, c.description, c.status,
       c.total_weeks, c.starts_at, c.created_at,
       c.weekly_price, c.currency, c.platform_fee_percent, c.is_free,
       COUNT(DISTINCT cp.player_id) AS player_count
     FROM fundraisely_puzzle_challenges c
     LEFT JOIN fundraisely_puzzle_challenge_players cp ON cp.challenge_id = c.id
     WHERE c.club_id = ?
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [clubId]
  );
  return rows;
}

export async function getChallengeById({ challengeId, clubId }) {
  const [[challenge]] = await database.connection.execute(
    `SELECT
       id, club_id, title, description, status,
       total_weeks, starts_at, created_at,
       weekly_price, currency, platform_fee_percent, is_free
     FROM fundraisely_puzzle_challenges
     WHERE id = ? AND club_id = ?
     LIMIT 1`,
    [challengeId, clubId]
  );

  if (!challenge) return null;

  const [schedule] = await database.connection.execute(
    `SELECT id, week_number, puzzle_type, difficulty, unlocks_at
     FROM fundraisely_puzzle_schedule
     WHERE challenge_id = ?
     ORDER BY week_number ASC`,
    [challengeId]
  );

  return { ...challenge, schedule };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateChallengeStatus({ challengeId, clubId, status }) {
  const allowed = ['draft', 'active', 'completed', 'cancelled'];
  if (!allowed.includes(status)) throw new Error(`Invalid status: ${status}`);

  const [result] = await database.connection.execute(
    `UPDATE fundraisely_puzzle_challenges
     SET status = ?
     WHERE id = ? AND club_id = ?`,
    [status, challengeId, clubId]
  );

  if (result.affectedRows === 0) return null;
  return getChallengeById({ challengeId, clubId });
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function enrollPlayers({ challengeId, clubId, playerIds }) {
  const [[challenge]] = await database.connection.execute(
    'SELECT id FROM fundraisely_puzzle_challenges WHERE id = ? AND club_id = ? LIMIT 1',
    [challengeId, clubId]
  );
  if (!challenge) return null;

  let enrolled = 0;
  for (const playerId of playerIds) {
    try {
      await database.connection.execute(
        `INSERT IGNORE INTO fundraisely_puzzle_challenge_players
           (challenge_id, player_id, club_id)
         VALUES (?, ?, ?)`,
        [challengeId, playerId, clubId]
      );
      enrolled++;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  return { enrolled };
}

export async function getEnrolledPlayers({ challengeId, clubId }) {
  const [rows] = await database.connection.execute(
    `SELECT
       s.id, s.name, s.email,
       cp.enrolled_at,
       cp.status
     FROM fundraisely_puzzle_challenge_players cp
     JOIN fundraisely_supporters s ON s.id = cp.player_id
     WHERE cp.challenge_id = ?
       AND cp.club_id = ?
     ORDER BY cp.enrolled_at ASC`,
    [challengeId, clubId]
  );
  return rows;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard({ challengeId }) {
  const [totals] = await database.connection.execute(
    `SELECT
       cp.player_id,
       s.name  AS player_name,
       COALESCE(SUM(ss.total_score), 0) AS total_score,
       COUNT(ss.id)                     AS weeks_completed
     FROM fundraisely_puzzle_challenge_players cp
    JOIN fundraisely_supporters s ON s.id = cp.player_id
     LEFT JOIN fundraisely_puzzle_submissions ss
       ON  ss.player_id   = cp.player_id
       AND ss.instance_id IN (
         SELECT id FROM fundraisely_puzzle_instances WHERE challenge_id = ?
       )
     WHERE cp.challenge_id = ?
     GROUP BY cp.player_id, s.name
     ORDER BY total_score DESC`,
    [challengeId, challengeId]
  );

  const [weekRows] = await database.connection.execute(
    `SELECT
       ss.player_id,
       pi.week_number,
       pi.puzzle_type,
       ss.is_correct,
       ss.total_score,
       ss.answer          AS player_answer,
       pi.solution_data   AS correct_answer
     FROM fundraisely_puzzle_submissions ss
     JOIN fundraisely_puzzle_instances pi ON pi.id = ss.instance_id
     WHERE pi.challenge_id = ?
     ORDER BY pi.week_number ASC`,
    [challengeId]
  );

  // Group week detail by player
 const weeksByPlayer = {};
  for (const row of weekRows) {
    if (!weeksByPlayer[row.player_id]) weeksByPlayer[row.player_id] = [];
    weeksByPlayer[row.player_id].push({
      weekNumber:    row.week_number,
      puzzleType:    row.puzzle_type,
      isCorrect:     Boolean(row.is_correct),
      totalScore:    row.total_score,
      playerAnswer:  safeParseJson(row.player_answer),
      correctAnswer: safeParseJson(row.correct_answer),
    });
  }

  return totals.map((player, index) => ({
    rank:           index + 1,
    playerId:       player.player_id,
    playerName:     player.player_name,
    totalScore:     player.total_score,
    weeksCompleted: player.weeks_completed,
    weeks:          weeksByPlayer[player.player_id] ?? [],
  }));
}

// ─── Current week ─────────────────────────────────────────────────────────────

export async function getCurrentWeek({ challengeId }) {
  const [[challenge]] = await database.connection.execute(
    'SELECT starts_at, total_weeks FROM fundraisely_puzzle_challenges WHERE id = ? LIMIT 1',
    [challengeId]
  );
  if (!challenge) return null;

  const weekMs     = getWeekMs();
  const now        = Date.now();
  const startMs    = new Date(challenge.starts_at).getTime();
  const elapsed    = now - startMs;
  const weekNumber = Math.max(1, Math.min(
    challenge.total_weeks,
    Math.floor(elapsed / weekMs) + 1
  ));

  return {
    weekNumber,
    startsAt:   challenge.starts_at,
    totalWeeks: challenge.total_weeks,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}