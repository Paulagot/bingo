/**
 * Puzzle Subscription Service
 * server/puzzles/services/puzzleSubscriptionService.js
 *
 * Free join flow only for now.
 * Paid Stripe flow added in Phase 5 (Section 18.3).
 */

import database from '../../config/database.js';

/**
 * Enroll a supporter into a free challenge.
 * Creates the challenge_players row and a subscription row
 * (status = 'active', weekly_price = 0) so the week access
 * check has a consistent record to query.
 */
export async function joinFree({ challengeId, supporterId, clubId }) {
  // Verify challenge exists, belongs to this club, and is free
  const [[challenge]] = await database.connection.execute(
    `SELECT id, is_free, status, total_weeks, starts_at
     FROM fundraisely_puzzle_challenges
     WHERE id = ? AND club_id = ?
     LIMIT 1`,
    [challengeId, clubId]
  );

  if (!challenge) {
    throw new Error('Challenge not found.');
  }
  if (!challenge.is_free) {
    throw new Error('This challenge requires payment to join.');
  }
  if (challenge.status === 'cancelled') {
    throw new Error('This challenge has been cancelled.');
  }

  // New sign-ups close once the LAST week has unlocked - starts_at +
  // (total_weeks - 1) weeks, matching exactly how each week's own
  // unlocksAt is computed in challengeService.js
  // (unlocksAt = startsAtMs + (entry.week - 1) * weekMs). This does NOT
  // affect anyone already enrolled - their own access continues
  // regardless of this date; it only blocks brand-new sign-ups.
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const startsAtMs = new Date(challenge.starts_at).getTime();
  const lastWeekUnlocksAt = startsAtMs + (challenge.total_weeks - 1) * weekMs;

  if (Date.now() > lastWeekUnlocksAt) {
    throw new Error('New sign-ups have closed for this challenge - the final week has already unlocked.');
  }

  // Enroll in challenge_players (INSERT IGNORE = safe to call twice)
  await database.connection.execute(
    `INSERT IGNORE INTO fundraisely_puzzle_challenge_players
       (challenge_id, player_id, club_id, enrolled_at, status)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), 'active')`,
    [challengeId, supporterId, clubId]
  );

  return { enrolled: true, challengeId };
}

/**
 * Check if a supporter is enrolled in a challenge.
 */
export async function getEnrollmentStatus({ challengeId, supporterId }) {
  const [[row]] = await database.connection.execute(
    `SELECT status FROM fundraisely_puzzle_challenge_players
     WHERE challenge_id = ? AND player_id = ?
     LIMIT 1`,
    [challengeId, supporterId]
  );
  return row ?? null;
}

/**
 * Get all challenges a supporter is enrolled in for a club.
 */
export async function getSupporterChallenges({ supporterId, clubId }) {
  const [rows] = await database.connection.execute(
    `SELECT
       c.id, c.title, c.description, c.status,
       c.total_weeks, c.starts_at, c.is_free,
       c.weekly_price, c.currency,
       cp.enrolled_at, cp.status AS enrollment_status
     FROM fundraisely_puzzle_challenge_players cp
     JOIN fundraisely_puzzle_challenges c ON c.id = cp.challenge_id
     WHERE cp.player_id = ? AND cp.club_id = ?
     ORDER BY cp.enrolled_at DESC`,
    [supporterId, clubId]
  );
  return rows;
}