/**
 * Challenge Service
 * server/puzzles/services/challengeService.js
 */

import database from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { ensureStripeProductAndPrice, cancelAllActiveSubscriptionsForChallenge } from './puzzleSubscriptionPaymentService.js';
import {
  createPuzzleSubRoom,
  openPuzzleSubRoom,
  cancelPuzzleSubRoom,
  completePuzzleSubRoom,
  updatePuzzleSubRoom,
  getPuzzleSubRoomByChallenge,
} from './puzzleSubRoomService.js';

function getWeekMs() {
  const seconds = parseInt(process.env.PUZZLE_WEEK_DURATION_SECONDS ?? '604800', 10);
  return seconds * 1000;
}

/**
 * Converts JS Date / ISO string into MySQL DATETIME format.
 *
 * MySQL DATETIME does not accept:
 *   2026-06-19T20:41:00.000Z
 *
 * It expects:
 *   2026-06-19 20:41:00
 *
 * This stores the value in UTC consistently.
 */
function toMysqlDateTime(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime value: ${value}`);
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Parses a MySQL DATETIME value as UTC.
 * Useful because MySQL DATETIME has no timezone info.
 */
function fromMysqlDateTimeAsUtc(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(`${value}Z`).getTime();
}

export async function createChallenge({
  clubId,
  hostId,
  hostName,
  title,
  description,
  totalWeeks,
  startsAt,
  puzzleSchedule,
  isFree,
  weeklyPrice,
  currency,
  sponsors,
}) {
  if (!isFree && !weeklyPrice) {
    throw new Error('weeklyPrice is required for paid challenges');
  }

  const id = uuidv4();

  const priceInCents = isFree ? null : Math.round(Number(weeklyPrice));

  const resolvedCurrency = currency ?? 'eur';
  const weekMs = getWeekMs();

  const startsAtMysql = toMysqlDateTime(startsAt);
  const startsAtMs = new Date(startsAt).getTime();

  if (Number.isNaN(startsAtMs)) {
    throw new Error(`Invalid startsAt value: ${startsAt}`);
  }

  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_challenges
       (id, club_id, title, description, total_weeks, starts_at, status,
        weekly_price, currency, platform_fee_percent, is_free)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, ?)`,
    [
      id,
      clubId,
      title,
      description ?? null,
      totalWeeks,
      startsAtMysql,
      priceInCents,
      resolvedCurrency,
      isFree ? 1 : 0,
    ]
  );

  if (puzzleSchedule?.length) {
    for (const entry of puzzleSchedule) {
      const unlocksAt = new Date(startsAtMs + (entry.week - 1) * weekMs);
      const unlocksAtMysql = toMysqlDateTime(unlocksAt);

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
          unlocksAtMysql,
        ]
      );
    }
  }

  // Create the management-system room row for this challenge so it
  // appears in the club dashboard, event linking, and reporting
  // infrastructure alongside quiz/elimination/ticketed_event rooms.
  // Non-fatal: if room creation fails the challenge itself is still
  // created — the club can still use it, they just won't see it in the
  // room management view until the room is created (which could be
  // retried later). Room_id is written back onto the challenge row so
  // the two tables stay linked.
  try {
    const roomId = await createPuzzleSubRoom({
      challengeId:  id,
      clubId,
      hostId:       hostId ?? clubId,
      hostName:     hostName ?? null,
      title,
      weeklyPrice:  priceInCents,
      currency:     resolvedCurrency,
      totalWeeks,
      startsAt,
      eventSponsors: sponsors ?? [],
    });

    await database.connection.execute(
      `UPDATE fundraisely_puzzle_challenges SET room_id = ? WHERE id = ?`,
      [roomId, id]
    );
  } catch (roomErr) {
    console.warn('[challengeService] ⚠️ Room creation failed for challenge', id, ':', roomErr.message);
  }

  return getChallengeById({ challengeId: id, clubId });
}

/**
 * Full edit — title, description, weeks, start date, schedule, price.
 * Only allowed while status === 'draft': ensureStripeProductAndPrice runs
 * once at Activate and existing subscribers' cancel_at math (see
 * applyCancelAtForSubscription in puzzleSubscriptionPaymentService.js)
 * assumes the schedule they joined against doesn't shift under them.
 * Enforced here server-side, not just hidden in the UI.
 */
export async function updateChallenge({
  challengeId,
  clubId,
  title,
  description,
  totalWeeks,
  startsAt,
  puzzleSchedule,
  isFree,
  weeklyPrice,
  currency,
  sponsors,
}) {
  const [[existing]] = await database.connection.execute(
    `SELECT status FROM fundraisely_puzzle_challenges WHERE id = ? AND club_id = ? LIMIT 1`,
    [challengeId, clubId]
  );

  if (!existing) return null;
  if (existing.status !== 'draft') {
    throw new Error('challenge_not_editable');
  }

  if (!isFree && !weeklyPrice) {
    throw new Error('weeklyPrice is required for paid challenges');
  }

  const priceInCents     = isFree ? null : Math.round(Number(weeklyPrice));
  const resolvedCurrency = currency ?? 'eur';
  const weekMs           = getWeekMs();

  const startsAtMysql = toMysqlDateTime(startsAt);
  const startsAtMs    = new Date(startsAt).getTime();

  if (Number.isNaN(startsAtMs)) {
    throw new Error(`Invalid startsAt value: ${startsAt}`);
  }

  await database.connection.execute(
    `UPDATE fundraisely_puzzle_challenges
     SET title = ?, description = ?, total_weeks = ?, starts_at = ?,
         weekly_price = ?, currency = ?, is_free = ?
     WHERE id = ? AND club_id = ?`,
    [
      title,
      description ?? null,
      totalWeeks,
      startsAtMysql,
      priceInCents,
      resolvedCurrency,
      isFree ? 1 : 0,
      challengeId,
      clubId,
    ]
  );

  // Replace the schedule wholesale — safe for a draft challenge since
  // nothing has unlocked or been played yet, so there's no history to
  // preserve or reconcile against.
  await database.connection.execute(
    `DELETE FROM fundraisely_puzzle_schedule WHERE challenge_id = ?`,
    [challengeId]
  );

  if (puzzleSchedule?.length) {
    for (const entry of puzzleSchedule) {
      const unlocksAt      = new Date(startsAtMs + (entry.week - 1) * weekMs);
      const unlocksAtMysql = toMysqlDateTime(unlocksAt);

      await database.connection.execute(
        `INSERT INTO fundraisely_puzzle_schedule
           (challenge_id, club_id, week_number, puzzle_type, difficulty, unlocks_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [challengeId, clubId, entry.week, entry.puzzleType, entry.difficulty ?? 'medium', unlocksAtMysql]
      );
    }
  }

  // Mirror the edit through to the room's config_json — same non-fatal
  // sync pattern used everywhere else in this file. This is also what
  // actually persists sponsors (see puzzleSubRoomService.updatePuzzleSubRoom),
  // since they live in config_json, not a column on this table.
  try {
    await updatePuzzleSubRoom({
      challengeId,
      clubId,
      title,
      weeklyPrice: priceInCents,
      currency: resolvedCurrency,
      totalWeeks,
      startsAt,
      eventSponsors: sponsors ?? [],
    });
  } catch (roomErr) {
    console.warn('[challengeService] ⚠️ Room config sync failed for challenge', challengeId, ':', roomErr.message);
  }

  return getChallengeById({ challengeId, clubId });
}

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
       c.id, c.club_id, c.title, c.description, c.status,
       c.total_weeks, c.starts_at, c.created_at, c.room_id,
       c.weekly_price, c.currency, c.platform_fee_percent, c.is_free,
       COUNT(DISTINCT cp.player_id) AS player_count
     FROM fundraisely_puzzle_challenges c
     LEFT JOIN fundraisely_puzzle_challenge_players cp ON cp.challenge_id = c.id
     WHERE c.id = ? AND c.club_id = ?
     GROUP BY c.id
     LIMIT 1`,
    [challengeId, clubId]
  );

  if (!challenge) return null;

  // Lazy safety net for auto-completion — see maybeAutoCompleteChallenge's
  // own comment for why this can't rely purely on the webhook event. Only
  // does real work (an extra COUNT query, possibly a status UPDATE) when
  // status is still 'active'; every other status returns false immediately.
  // If it did complete just now, re-fetch fresh rather than return this
  // now-stale 'active' snapshot — safe to recurse: the inner call's status
  // will already read 'completed', so its own auto-complete check
  // short-circuits immediately and this cannot loop.
  if (challenge.status === 'active') {
    const justCompleted = await maybeAutoCompleteChallenge({
      challengeId,
      clubId,
      status: challenge.status,
      startsAt: challenge.starts_at,
      totalWeeks: challenge.total_weeks,
    });
    if (justCompleted) {
      return getChallengeById({ challengeId, clubId });
    }
  }

  const [schedule] = await database.connection.execute(
    `SELECT id, week_number, puzzle_type, difficulty, unlocks_at
     FROM fundraisely_puzzle_schedule
     WHERE challenge_id = ?
     ORDER BY week_number ASC`,
    [challengeId]
  );

  // Sponsors live on the room's config_json (same convention as
  // ticketed_event's eventSponsors), not a column on this table —
  // fetched via the same room lookup other parts of this file already
  // use. Non-fatal: a missing/unlinked room just means no sponsors data,
  // not a failed challenge load.
  let sponsors = [];
  try {
    const room = await getPuzzleSubRoomByChallenge({ challengeId, clubId });
    sponsors = room?.config_json?.eventSponsors ?? [];
  } catch (err) {
    console.warn('[challengeService] ⚠️ Could not load sponsors from room config for', challengeId, ':', err.message);
  }

  return { ...challenge, player_count: Number(challenge.player_count ?? 0), sponsors, schedule };
}

/**
 * Reverse lookup — given a room_id (what the mgtsystem dashboard/drawer
 * actually has, via fundraisely_event_integrations.external_ref), find
 * the challenge it belongs to. room_id is unique per challenge (written
 * once by createChallenge and never reassigned), so this is a plain
 * lookup, not a join across multiple candidates.
 */
export async function getChallengeByRoomId({ roomId, clubId }) {
  const [[row]] = await database.connection.execute(
    `SELECT id
     FROM fundraisely_puzzle_challenges
     WHERE room_id = ? AND club_id = ?
     LIMIT 1`,
    [roomId, clubId]
  );

  if (!row) return null;

  return getChallengeById({ challengeId: row.id, clubId });
}

// ─── Auto-completion ────────────────────────────────────────────────────────
//
// Nothing manually flips a challenge to 'completed' any more (Mark Complete
// was removed — every subscriber's own Stripe cancel_at already handles
// their billing stopping on schedule with zero action needed). But the
// challenge itself still needs to eventually reach 'completed' once it's
// genuinely over, both for reporting and so the reconciliation flow has a
// clear "this is the final period" moment.
//
// "Over" means BOTH of these, not just one:
//   1. The enrollment window has closed (no new sign-ups possible) — using
//      the same total_weeks - 1 formula everywhere else in this file.
//   2. Every subscription tied to this challenge has reached a terminal
//      state — nobody left in 'active' or 'past_due'. This covers people
//      who ran their full term AND people who cancelled early; either way
//      ends the same way in fundraisely_puzzle_subscriptions.
//
// Checked from two places: the customer.subscription.deleted webhook
// (event-driven — fires the moment the LAST active subscriber's own
// subscription ends), and lazily inside getChallengeById (covers the edge
// case where the enrollment window closes AFTER every subscriber already
// cancelled early — no subscription-cancelled event is left to re-trigger
// the check at that later moment, so the next time anyone actually looks
// at the challenge catches it instead).

function isEnrollmentWindowClosed(startsAt, totalWeeks) {
  const weekMs = getWeekMs();
  const startsAtMs = new Date(startsAt).getTime();
  const lastWeekUnlocksAt = startsAtMs + (totalWeeks - 1) * weekMs;
  return Date.now() > lastWeekUnlocksAt;
}

async function hasRemainingActiveSubscriptions(challengeId) {
  const [[row]] = await database.connection.execute(
    `SELECT COUNT(*) AS cnt
     FROM fundraisely_puzzle_subscriptions
     WHERE challenge_id = ? AND status IN ('active', 'past_due')`,
    [challengeId]
  );
  return Number(row?.cnt ?? 0) > 0;
}

/**
 * Checks the two conditions above and flips the challenge to 'completed'
 * if both hold. Takes already-known status/startsAt/totalWeeks so callers
 * that already have the row (getChallengeById) don't re-fetch it — the
 * webhook path, which only starts with a challengeId, fetches them itself
 * first. Returns true if it actually completed the challenge, false
 * otherwise (including "nothing to do" — status wasn't 'active').
 */
export async function maybeAutoCompleteChallenge({ challengeId, clubId, status, startsAt, totalWeeks }) {
  if (status !== 'active') return false;
  if (!isEnrollmentWindowClosed(startsAt, totalWeeks)) return false;
  if (await hasRemainingActiveSubscriptions(challengeId)) return false;

  console.log(`[challengeService] 🏁 Auto-completing challenge ${challengeId} — enrollment closed and no active subscriptions remain`);
  await updateChallengeStatus({ challengeId, clubId, status: 'completed' });
  return true;
}

export async function updateChallengeStatus({ challengeId, clubId, status }) {
  const allowed = ['draft', 'active', 'completed', 'cancelled'];

  if (!allowed.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  if (status === 'active') {
    const [[challenge]] = await database.connection.execute(
      `SELECT is_free FROM fundraisely_puzzle_challenges
       WHERE id = ? AND club_id = ?
       LIMIT 1`,
      [challengeId, clubId]
    );

    if (!challenge) return null;

    if (!challenge.is_free) {
      await ensureStripeProductAndPrice({ challengeId, clubId });
    }
  }

  const [result] = await database.connection.execute(
    `UPDATE fundraisely_puzzle_challenges
     SET status = ?
     WHERE id = ? AND club_id = ?`,
    [status, challengeId, clubId]
  );

  if (result.affectedRows === 0) return null;

  // Mirror the status change through to the management-system room row
  // so the club dashboard, event linking, and reporting stay in sync.
  // Non-fatal — the challenge status has already been updated; a room
  // sync failure is logged but doesn't roll back the challenge update.
  let stripeCancelSummary = null;
  try {
    if (status === 'active') {
      await openPuzzleSubRoom({ challengeId, clubId });
    } else if (status === 'cancelled') {
      await cancelPuzzleSubRoom({ challengeId, clubId });
      // The actual missing piece Cancel needed: without this, existing
      // subscribers kept being billed indefinitely regardless of the
      // challenge being "cancelled" — cancelPuzzleSubRoom only ever
      // flipped local status. This stops billing immediately for every
      // active subscriber; it never touches access or issues refunds.
      // Errors here are non-fatal to the status change itself (the
      // challenge is still cancelled either way) but the summary is
      // returned so the UI can tell the club if anything needs manual
      // follow-up in the Stripe dashboard.
      stripeCancelSummary = await cancelAllActiveSubscriptionsForChallenge({ challengeId, clubId });
    } else if (status === 'completed') {
      await completePuzzleSubRoom({ challengeId, clubId });
    }
    // 'draft' has no direct room equivalent — a challenge going back to
    // draft (e.g. after a failed activation attempt) leaves the room as
    // 'scheduled', which is correct: the room was always at 'scheduled'
    // until activation, so reverting to draft just means "don't open it."
  } catch (roomErr) {
    console.warn('[challengeService] ⚠️ Room status sync failed for challenge', challengeId, ':', roomErr.message);
  }

  const updatedChallenge = await getChallengeById({ challengeId, clubId });
  return stripeCancelSummary
    ? { ...updatedChallenge, stripeCancelSummary }
    : updatedChallenge;
}

export async function enrollPlayers({ challengeId, clubId, playerIds }) {
  const [[challenge]] = await database.connection.execute(
    `SELECT id
     FROM fundraisely_puzzle_challenges
     WHERE id = ? AND club_id = ?
     LIMIT 1`,
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
      if (err.code !== 'ER_DUP_ENTRY') {
        throw err;
      }
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
       ON  ss.player_id = cp.player_id
       AND ss.instance_id IN (
         SELECT id
         FROM fundraisely_puzzle_instances
         WHERE challenge_id = ?
       )
     WHERE cp.challenge_id = ?
     GROUP BY cp.player_id, s.name
     ORDER BY total_score DESC`,
    [challengeId, challengeId]
  );

  // ⚠️ Deliberately NO ss.answer and NO pi.solution_data here.
  // Weekly puzzles stay live for the whole life of the challenge (players
  // join on their own clock and always start at week 1), so there is never
  // a safe moment to expose solutions — and a correct player's answer IS
  // the solution. Sending either field to any client, even one whose UI
  // hides it, leaks answers via the network response. Do not add them back.
  const [weekRows] = await database.connection.execute(
    `SELECT
       ss.player_id,
       pi.week_number,
       pi.puzzle_type,
       ss.is_correct,
       ss.total_score,
       ss.time_taken_seconds,
       ss.submitted_at
     FROM fundraisely_puzzle_submissions ss
     JOIN fundraisely_puzzle_instances pi ON pi.id = ss.instance_id
     WHERE pi.challenge_id = ?
     ORDER BY pi.week_number ASC`,
    [challengeId]
  );

  const weeksByPlayer = {};

  for (const row of weekRows) {
    if (!weeksByPlayer[row.player_id]) {
      weeksByPlayer[row.player_id] = [];
    }

    weeksByPlayer[row.player_id].push({
      weekNumber: row.week_number,
      puzzleType: row.puzzle_type,
      isCorrect: Boolean(row.is_correct),
      totalScore: row.total_score,
      timeTakenSeconds: row.time_taken_seconds ?? null,
      submittedAt: row.submitted_at ?? null,
    });
  }

  return totals.map((player, index) => ({
    rank: index + 1,
    playerId: player.player_id,
    playerName: player.player_name,
    totalScore: Number(player.total_score ?? 0),
    weeksCompleted: Number(player.weeks_completed ?? 0),
    weeks: weeksByPlayer[player.player_id] ?? [],
  }));
}

// ─── Public leaderboards ─────────────────────────────────────────────────────
//
// These back the UNAUTHENTICATED endpoints in challengeRoutes.js. Rules:
//   - Only respond for challenges in 'active' or 'completed' status — drafts
//     and cancelled challenges return null and the route 404s.
//   - Never include answers, solutions, emails, or internal IDs beyond what
//     the page needs. Names are supporter screen names (the join form tells
//     players to use a screen name and collects GDPR consent).
//   - Ranking: total_score DESC, then time_taken_seconds ASC, then
//     submitted_at ASC (earlier submission wins remaining ties).

/**
 * Minimal challenge metadata for public pages. Returns null unless the
 * challenge is 'active' or 'completed' — that null is the visibility gate
 * every public leaderboard call runs through.
 */
export async function getPublicChallengeMeta({ challengeId }) {
  const [[challenge]] = await database.connection.execute(
    `SELECT id, title, status, total_weeks, starts_at
     FROM fundraisely_puzzle_challenges
     WHERE id = ? AND status IN ('active', 'completed')
     LIMIT 1`,
    [challengeId]
  );

  return challenge ?? null;
}

/**
 * Full leaderboard for one week's puzzle. Public — every player who has
 * submitted this week appears, regardless of when they joined the
 * challenge, which is the whole point: late joiners compete on equal
 * footing per puzzle even though they can never catch up cumulatively.
 */
export async function getWeekLeaderboard({ challengeId, weekNumber }) {
  const challenge = await getPublicChallengeMeta({ challengeId });
  if (!challenge) return null;

  const [[schedule]] = await database.connection.execute(
    `SELECT puzzle_type, difficulty
     FROM fundraisely_puzzle_schedule
     WHERE challenge_id = ? AND week_number = ?
     LIMIT 1`,
    [challengeId, weekNumber]
  );

  if (!schedule) return null;

  const [rows] = await database.connection.execute(
    `SELECT
       s.name AS player_name,
       ss.total_score,
       ss.is_correct,
       ss.time_taken_seconds,
       ss.submitted_at
     FROM fundraisely_puzzle_submissions ss
     JOIN fundraisely_supporters s ON s.id = ss.player_id
     WHERE ss.challenge_id = ? AND ss.week_number = ?
     ORDER BY ss.total_score DESC, ss.time_taken_seconds ASC, ss.submitted_at ASC`,
    [challengeId, weekNumber]
  );

  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      status: challenge.status,
      totalWeeks: challenge.total_weeks,
    },
    weekNumber: Number(weekNumber),
    puzzleType: schedule.puzzle_type,
    difficulty: schedule.difficulty,
    // 'final' only once the challenge has completed — until then late
    // joiners can still submit this week and the board can still change.
    isFinal: challenge.status === 'completed',
    entries: rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.player_name,
      totalScore: Number(row.total_score ?? 0),
      isCorrect: Boolean(row.is_correct),
      timeTakenSeconds: row.time_taken_seconds ?? null,
      submittedAt: row.submitted_at ?? null,
    })),
  };
}

/**
 * Top 3 for every week of a challenge in one call — the public
 * "wall of fame" view. Uses ROW_NUMBER() (MySQL 8+) to rank within each
 * week with the same tie-break order as getWeekLeaderboard.
 */
export async function getPublicLeaderboardSummary({ challengeId }) {
  const challenge = await getPublicChallengeMeta({ challengeId });
  if (!challenge) return null;

  const [rows] = await database.connection.execute(
    `SELECT week_number, player_name, total_score, is_correct,
            time_taken_seconds, submitted_at, week_rank, week_player_count
     FROM (
       SELECT
         ss.week_number,
         s.name AS player_name,
         ss.total_score,
         ss.is_correct,
         ss.time_taken_seconds,
         ss.submitted_at,
         ROW_NUMBER() OVER (
           PARTITION BY ss.week_number
           ORDER BY ss.total_score DESC, ss.time_taken_seconds ASC, ss.submitted_at ASC
         ) AS week_rank,
         COUNT(*) OVER (PARTITION BY ss.week_number) AS week_player_count
       FROM fundraisely_puzzle_submissions ss
       JOIN fundraisely_supporters s ON s.id = ss.player_id
       WHERE ss.challenge_id = ?
     ) ranked
     WHERE week_rank <= 3
     ORDER BY week_number ASC, week_rank ASC`,
    [challengeId]
  );

  const [schedule] = await database.connection.execute(
    `SELECT week_number, puzzle_type, difficulty, unlocks_at,
            unlocks_at <= UTC_TIMESTAMP() AS is_unlocked
     FROM fundraisely_puzzle_schedule
     WHERE challenge_id = ?
     ORDER BY week_number ASC`,
    [challengeId]
  );

  const topByWeek = {};
  for (const row of rows) {
    if (!topByWeek[row.week_number]) topByWeek[row.week_number] = { top: [], playerCount: 0 };
    topByWeek[row.week_number].playerCount = Number(row.week_player_count ?? 0);
    topByWeek[row.week_number].top.push({
      rank: Number(row.week_rank),
      playerName: row.player_name,
      totalScore: Number(row.total_score ?? 0),
      isCorrect: Boolean(row.is_correct),
      timeTakenSeconds: row.time_taken_seconds ?? null,
    });
  }

  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      status: challenge.status,
      totalWeeks: challenge.total_weeks,
    },
    isFinal: challenge.status === 'completed',
    weeks: schedule.map(week => ({
      weekNumber: week.week_number,
      puzzleType: week.puzzle_type,
      difficulty: week.difficulty,
      isUnlocked: Boolean(week.is_unlocked),
      playerCount: topByWeek[week.week_number]?.playerCount ?? 0,
      top: topByWeek[week.week_number]?.top ?? [],
    })),
  };
}

export async function getCurrentWeek({ challengeId }) {
  const [[challenge]] = await database.connection.execute(
    `SELECT starts_at, total_weeks
     FROM fundraisely_puzzle_challenges
     WHERE id = ?
     LIMIT 1`,
    [challengeId]
  );

  if (!challenge) return null;

  const weekMs = getWeekMs();
  const now = Date.now();

  const startMs = fromMysqlDateTimeAsUtc(challenge.starts_at);

  if (!startMs || Number.isNaN(startMs)) {
    throw new Error(`Invalid starts_at value for challenge ${challengeId}`);
  }

  const elapsed = now - startMs;

  const weekNumber = Math.max(
    1,
    Math.min(challenge.total_weeks, Math.floor(elapsed / weekMs) + 1)
  );

  return {
    weekNumber,
    startsAt: challenge.starts_at,
    totalWeeks: challenge.total_weeks,
  };
}

function safeParseJson(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}