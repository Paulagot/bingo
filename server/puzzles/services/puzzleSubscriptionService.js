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
    `SELECT id, is_free, status, total_weeks
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

  // Enroll in challenge_players (INSERT IGNORE = safe to call twice)
  await database.connection.execute(
    `INSERT IGNORE INTO fundraisely_puzzle_challenge_players
       (challenge_id, player_id, club_id, enrolled_at, status)
     VALUES (?, ?, ?, NOW(), 'active')`,
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