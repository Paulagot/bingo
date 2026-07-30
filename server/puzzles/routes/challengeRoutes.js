/**
 * Challenge Routes
 * server/puzzles/routes/challengeRoutes.js
 *
 * Three auth tiers in this file:
 *   - /public/* routes    → no auth. Per-week leaderboards and the
 *                           wall-of-fame summary. Only respond for
 *                           'active'/'completed' challenges, and never
 *                           include answers or solutions.
 *   - /:id/leaderboard    → authenticateAny (club OR supporter token).
 *                           Cumulative board, visible to the club and to
 *                           enrolled players.
 *   - everything else     → authenticateToken (club only). club_id always
 *                           comes from req.club_id.
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import authenticateAny from '../../middleware/authenticateAny.js';
import {
  resolveEntitlements,
  consumeCredit,
} from '../../policy/entitlements.js';
import {
  createChallenge,
  getChallengesByClub,
  getChallengeById,
  getChallengeByRoomId,
  updateChallenge,
  updateChallengeStatus,
  enrollPlayers,
  getEnrolledPlayers,
  getLeaderboard,
  getWeekLeaderboard,
  getPublicLeaderboardSummary,
  getCurrentWeek,
} from '../services/challengeService.js';
import { generateSchedule } from '../services/scheduleGeneratorService.js';

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// Registered FIRST so Express never matches 'public' as a :challengeId value
// (same ordering trick as /by-room/:roomId below). No auth middleware - the
// service layer's status gate ('active'/'completed' only) is the guard.

// GET /api/puzzle-challenges/public/:challengeId/leaderboard-summary
// Top 3 for every week - the shareable "wall of fame" + recruitment page.
router.get('/public/:challengeId/leaderboard-summary', async (req, res) => {
  try {
    const summary = await getPublicLeaderboardSummary({
      challengeId: req.params.challengeId,
    });
    if (!summary) return res.status(404).json({ error: 'Challenge not found' });
    res.json(summary);
  } catch (err) {
    console.error('[challenges] GET public summary error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard summary.' });
  }
});

// GET /api/puzzle-challenges/public/:challengeId/weeks/:weekNumber/leaderboard
// Full board for one week's puzzle. Rolling - grows as late joiners submit;
// isFinal flips true only when the challenge completes.
router.get('/public/:challengeId/weeks/:weekNumber/leaderboard', async (req, res) => {
  try {
    const weekNumber = parseInt(req.params.weekNumber, 10);
    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      return res.status(400).json({ error: 'Invalid week number' });
    }

    const board = await getWeekLeaderboard({
      challengeId: req.params.challengeId,
      weekNumber,
    });
    if (!board) return res.status(404).json({ error: 'Leaderboard not found' });
    res.json(board);
  } catch (err) {
    console.error('[challenges] GET public week leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

// Fallback cap used only if a plan somehow has no puzzle_sub caps row
// (shouldn't happen after migration 004, but keeps this endpoint from
// exploding rather than blocking on missing config).
const DEFAULT_MAX_WEEKS = 6;

// ─── POST /api/puzzle-challenges ──────────────────────────────────────────────
// Create a new challenge with its week schedule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, totalWeeks, startsAt, puzzleSchedule, isFree, weeklyPrice, currency, sponsors } = req.body;
    const clubId = req.club_id;

    if (!title)      return res.status(400).json({ error: 'title is required' });
    if (!totalWeeks) return res.status(400).json({ error: 'totalWeeks is required' });
    if (!startsAt)   return res.status(400).json({ error: 'startsAt is required' });

    // puzzleSchedule is OPTIONAL: when the club doesn't hand-pick weeks
    // (the default create flow), generate one - shuffled-deck type
    // rotation + difficulty ramp, see scheduleGeneratorService.js. A
    // provided schedule (edit mode / advanced use) must still cover every
    // week exactly. Either way, downstream code sees a normal schedule.
    let resolvedSchedule = puzzleSchedule;
    if (!resolvedSchedule?.length) {
      resolvedSchedule = generateSchedule(Number(totalWeeks));
      console.log(`[challenges] 🎲 Auto-generated ${resolvedSchedule.length}-week schedule`);
    } else if (resolvedSchedule.length !== totalWeeks) {
      return res.status(400).json({ error: `puzzleSchedule must have exactly ${totalWeeks} entries` });
    }
    if (!isFree && !weeklyPrice) {
      return res.status(400).json({ error: 'weeklyPrice is required for paid challenges' });
    }

    // ── Entitlements gate ──────────────────────────────────────────────────
    // Mirrors the pattern in ticketedEventMgmtRoutes.js POST /schedule:
    // resolve entitlements, block on no credits, enforce plan caps, create,
    // then consume the credit (non-fatal if the consume step itself fails -
    // the challenge has already been created at that point).
    const ents = await resolveEntitlements({ userId: clubId, scope: 'puzzle_sub' });

    console.log(`[challenges] 🔑 Entitlements - plan: ${ents.plan_code} credits: ${ents.game_credits_remaining}`);

    if ((ents.game_credits_remaining ?? 0) <= 0) {
      return res.status(402).json({
        error: 'no_credits',
        message: ents.plan_code === 'FREE'
          ? "You've used your one free Puzzle Challenge. Upgrade your plan to run more."
          : "You've used all your activity credits this month. Upgrade for more.",
        upgradeUrl: '/settings/billing',
      });
    }

    const maxWeeks = Number(ents.game_caps?.maxWeeks ?? DEFAULT_MAX_WEEKS);
    if (Number(totalWeeks) > maxWeeks) {
      return res.status(400).json({
        error: 'weeks_cap_exceeded',
        message: `Your plan allows challenges up to ${maxWeeks} weeks long.`,
        upgradeUrl: ents.plan_code === 'FREE' ? '/settings/billing' : undefined,
      });
    }

    const challenge = await createChallenge({
      clubId,
      hostId:   req.user?.id   ?? clubId,
      hostName: req.user?.name ?? null,
      title, description, totalWeeks, startsAt,
      puzzleSchedule: resolvedSchedule,
      isFree: Boolean(isFree),
      weeklyPrice,
      currency,
      sponsors,
    });

    const creditResult = await consumeCredit(clubId, 'puzzle_sub', ents.plan_code);
    if (!creditResult.ok) {
      console.error(
        `[challenges] ⚠️ Credit consume failed after challenge creation - club: ${clubId} challenge: ${challenge.id}`,
      );
    } else {
      console.log(`[challenges] ✅ Credit consumed - club: ${clubId}`);
    }

    res.status(201).json(challenge);
  } catch (err) {
    console.error('[challenges] POST error:', err);
    res.status(500).json({ error: 'Failed to create challenge.' });
  }
});

// ─── GET /api/puzzle-challenges ───────────────────────────────────────────────
// List all challenges for the logged-in club
router.get('/', authenticateToken, async (req, res) => {
  try {
    const challenges = await getChallengesByClub({ clubId: req.club_id });
    res.json(challenges);
  } catch (err) {
    console.error('[challenges] GET list error:', err);
    res.status(500).json({ error: 'Failed to load challenges.' });
  }
});

// ─── GET /api/puzzle-challenges/by-room/:roomId ───────────────────────────────
// Reverse lookup for the mgtsystem dashboard/drawer, which only ever has a
// room_id (via fundraisely_event_integrations), not the challengeId.
// Must be registered before GET /:challengeId or Express would match
// "by-room" as a challengeId value instead.
router.get('/by-room/:roomId', authenticateToken, async (req, res) => {
  try {
    const challenge = await getChallengeByRoomId({
      roomId: req.params.roomId,
      clubId: req.club_id,
    });
    if (!challenge) return res.status(404).json({ error: 'No challenge found for this room' });
    res.json(challenge);
  } catch (err) {
    console.error('[challenges] GET by-room error:', err);
    res.status(500).json({ error: 'Failed to load challenge.' });
  }
});

// ─── GET /api/puzzle-challenges/:challengeId ──────────────────────────────────
// Get a single challenge with its week schedule
router.get('/:challengeId', authenticateToken, async (req, res) => {
  try {
    const challenge = await getChallengeById({
      challengeId: req.params.challengeId,
      clubId:      req.club_id,
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json(challenge);
  } catch (err) {
    console.error('[challenges] GET single error:', err);
    res.status(500).json({ error: 'Failed to load challenge.' });
  }
});

// ─── PATCH /api/puzzle-challenges/:challengeId ───────────────────────────────
// Full edit - only succeeds while the challenge is still a draft (see
// updateChallenge's own guard). Separate from the /status route below,
// which only ever changes the one field.
router.patch('/:challengeId', authenticateToken, async (req, res) => {
  try {
    const { title, description, totalWeeks, startsAt, puzzleSchedule, isFree, weeklyPrice, currency, sponsors } = req.body;

    if (!title)      return res.status(400).json({ error: 'title is required' });
    if (!totalWeeks) return res.status(400).json({ error: 'totalWeeks is required' });
    if (!startsAt)   return res.status(400).json({ error: 'startsAt is required' });
    if (!isFree && !weeklyPrice) {
      return res.status(400).json({ error: 'weeklyPrice is required for paid challenges' });
    }

    const updated = await updateChallenge({
      challengeId: req.params.challengeId,
      clubId:      req.club_id,
      title, description, totalWeeks, startsAt, puzzleSchedule,
      isFree: Boolean(isFree),
      weeklyPrice,
      currency,
      sponsors,
    });

    if (!updated) return res.status(404).json({ error: 'Challenge not found' });
    res.json(updated);
  } catch (err) {
    console.error('[challenges] PATCH error:', err);
    if (err.message === 'challenge_not_editable') {
      return res.status(409).json({
        error: err.message,
        message: 'This challenge can no longer be edited - it has already been activated.',
      });
    }
    if (err.message?.includes('weeklyPrice')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update challenge.' });
  }
});

// ─── PATCH /api/puzzle-challenges/:challengeId/status ────────────────────────
router.patch('/:challengeId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const updated = await updateChallengeStatus({
      challengeId: req.params.challengeId,
      clubId:      req.club_id,
      status,
    });
    if (!updated) return res.status(404).json({ error: 'Challenge not found' });
    res.json(updated);
  } catch (err) {
    console.error('[challenges] PATCH status error:', err);
    const msg = err.message || '';
    if (msg.startsWith('Invalid status')) return res.status(400).json({ error: msg });
    if (msg === 'stripe_not_connected') {
      return res.status(422).json({
        error: msg,
        message: 'Connect Stripe before activating a paid challenge.',
      });
    }
    if (msg === 'invalid_weekly_price') {
      return res.status(400).json({ error: msg, message: 'This challenge has no valid weekly price set.' });
    }
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ─── POST /api/puzzle-challenges/:challengeId/players ────────────────────────
router.post('/:challengeId/players', authenticateToken, async (req, res) => {
  try {
    const { playerIds } = req.body;
    if (!Array.isArray(playerIds) || !playerIds.length) {
      return res.status(400).json({ error: 'playerIds array is required' });
    }

    const result = await enrollPlayers({
      challengeId: req.params.challengeId,
      clubId:      req.club_id,
      playerIds,
    });
    if (!result) return res.status(404).json({ error: 'Challenge not found' });
    res.json(result);
  } catch (err) {
    console.error('[challenges] POST players error:', err);
    res.status(500).json({ error: 'Failed to enroll players.' });
  }
});

// ─── GET /api/puzzle-challenges/:challengeId/players ─────────────────────────
router.get('/:challengeId/players', authenticateToken, async (req, res) => {
  try {
    const players = await getEnrolledPlayers({
      challengeId: req.params.challengeId,
      clubId:      req.club_id,
    });
    res.json(players);
  } catch (err) {
    console.error('[challenges] GET players error:', err);
    res.status(500).json({ error: 'Failed to load players.' });
  }
});

// ─── GET /api/puzzle-challenges/:challengeId/leaderboard ─────────────────────
// authenticateAny: visible to the club AND to supporters (players). The
// payload contains no answers or solutions (see getLeaderboard's comment),
// so a supporter seeing other players' scores/times is by design - it's the
// cumulative competition standing.
router.get('/:challengeId/leaderboard', authenticateAny, async (req, res) => {
  try {
    const leaderboard = await getLeaderboard({ challengeId: req.params.challengeId });
    res.json(leaderboard);
  } catch (err) {
    console.error('[challenges] GET leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

// ─── GET /api/puzzle-challenges/:challengeId/current-week ────────────────────
router.get('/:challengeId/current-week', authenticateToken, async (req, res) => {
  try {
    const week = await getCurrentWeek({ challengeId: req.params.challengeId });
    if (!week) return res.status(404).json({ error: 'Challenge not found' });
    res.json(week);
  } catch (err) {
    console.error('[challenges] GET current-week error:', err);
    res.status(500).json({ error: 'Failed to get current week.' });
  }
});

export default router;