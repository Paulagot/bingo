/**
 * Challenge Routes
 * server/puzzles/routes/challengeRoutes.js
 *
 * All routes require authenticateToken.
 * club_id always comes from req.club_id (the logged-in club manages its own challenges).
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  resolveEntitlements,
  consumeCredit,
} from '../../policy/entitlements.js';
import {
  createChallenge,
  getChallengesByClub,
  getChallengeById,
  updateChallengeStatus,
  enrollPlayers,
  getEnrolledPlayers,
  getLeaderboard,
  getCurrentWeek,
} from '../services/challengeService.js';

const router = express.Router();

// Fallback cap used only if a plan somehow has no puzzle_sub caps row
// (shouldn't happen after migration 004, but keeps this endpoint from
// exploding rather than blocking on missing config).
const DEFAULT_MAX_WEEKS = 6;

// ─── POST /api/puzzle-challenges ──────────────────────────────────────────────
// Create a new challenge with its week schedule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, totalWeeks, startsAt, puzzleSchedule, isFree, weeklyPrice, currency } = req.body;
    const clubId = req.club_id;

    if (!title)      return res.status(400).json({ error: 'title is required' });
    if (!totalWeeks) return res.status(400).json({ error: 'totalWeeks is required' });
    if (!startsAt)   return res.status(400).json({ error: 'startsAt is required' });
    if (!puzzleSchedule?.length) return res.status(400).json({ error: 'puzzleSchedule is required' });
    if (puzzleSchedule.length !== totalWeeks) {
      return res.status(400).json({ error: `puzzleSchedule must have exactly ${totalWeeks} entries` });
    }
    if (!isFree && !weeklyPrice) {
      return res.status(400).json({ error: 'weeklyPrice is required for paid challenges' });
    }

    // ── Entitlements gate ──────────────────────────────────────────────────
    // Mirrors the pattern in ticketedEventMgmtRoutes.js POST /schedule:
    // resolve entitlements, block on no credits, enforce plan caps, create,
    // then consume the credit (non-fatal if the consume step itself fails —
    // the challenge has already been created at that point).
    const ents = await resolveEntitlements({ userId: clubId, scope: 'puzzle_sub' });

    console.log(`[challenges] 🔑 Entitlements — plan: ${ents.plan_code} credits: ${ents.game_credits_remaining}`);

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
      title, description, totalWeeks, startsAt, puzzleSchedule,
      isFree: Boolean(isFree),
      weeklyPrice,
      currency,
    });

    const creditResult = await consumeCredit(clubId, 'puzzle_sub', ents.plan_code);
    if (!creditResult.ok) {
      console.error(
        `[challenges] ⚠️ Credit consume failed after challenge creation — club: ${clubId} challenge: ${challenge.id}`,
      );
    } else {
      console.log(`[challenges] ✅ Credit consumed — club: ${clubId}`);
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
router.get('/:challengeId/leaderboard', authenticateToken, async (req, res) => {
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