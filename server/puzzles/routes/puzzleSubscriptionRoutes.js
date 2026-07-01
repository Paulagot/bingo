/**
 * Puzzle Subscription Routes
 * server/puzzles/routes/puzzleSubscriptionRoutes.js
 */

import express from 'express';
import authenticateSupporter from '../../middleware/authenticateSupporter.js';
import {
  joinFree,
  getEnrollmentStatus,
  getSupporterChallenges,
} from '../services/puzzleSubscriptionService.js';
import { createCheckoutSession, exchangeSessionForSupporterToken } from '../services/puzzleSubscriptionPaymentService.js';
import database from '../../config/database.js';

const router = express.Router();

/**
 * POST /api/puzzle-subscriptions/checkout
 * Public. Body: { challengeId, name, email }
 *
 * Creates/reuses a Stripe Customer + supporter record and returns a
 * Stripe Checkout Session URL (subscription mode) for a paid challenge.
 * No supporter JWT required up front — the supporter record is created
 * here, mirroring how Stripe walk-in checkout works for quiz/elimination
 * (createWalkinStripeSession) rather than the magic-link-first flow.
 */
router.post('/checkout', async (req, res) => {
  try {
    const { challengeId, name, email } = req.body;
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });
    if (!name)         return res.status(400).json({ error: 'name is required' });
    if (!email)        return res.status(400).json({ error: 'email is required' });

    const [[challenge]] = await database.connection.execute(
      'SELECT club_id FROM fundraisely_puzzle_challenges WHERE id = ? LIMIT 1',
      [challengeId]
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const result = await createCheckoutSession({
      challengeId,
      supporterEmail: email.trim(),
      supporterName:  name.trim(),
      clubId:         challenge.club_id,
    });
    res.json({ url: result.url });
  } catch (err) {
    console.error('[puzzle-subscriptions] checkout error:', err);
    const msg = err?.message || 'checkout_failed';
    if (msg === 'stripe_not_connected') {
      return res.status(422).json({ error: msg, message: 'This club has not finished setting up payments for this challenge.' });
    }
    if (msg.includes('not found') || msg.includes('free') || msg.includes('cancelled')) {
      return res.status(400).json({ error: msg });
    }
    if (msg.includes('opted out')) {
      return res.status(403).json({ error: msg });
    }
    res.status(500).json({ error: 'Failed to start checkout.' });
  }
});

/**
 * POST /api/puzzle-subscriptions/exchange-session
 * Public. Body: { sessionId, challengeId }
 *
 * Called once by the frontend right after landing back on
 * /challenges/:challengeId/play from Stripe Checkout (success_url
 * carries ?session_id=... but deliberately carries no token). Verifies
 * the session directly against Stripe and, if it's a genuinely
 * completed puzzle_subscription checkout for this exact challenge,
 * returns a supporter JWT the frontend then stores the same way the
 * magic-link flow does (setSupporterToken). See
 * exchangeSessionForSupporterToken for why this checks Stripe directly
 * rather than racing the webhook.
 */
router.post('/exchange-session', async (req, res) => {
  try {
    const { sessionId, challengeId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const result = await exchangeSessionForSupporterToken({ sessionId, challengeId });
    res.json(result);
  } catch (err) {
    console.error('[puzzle-subscriptions] exchange-session error:', err);
    const msg = err?.message || 'exchange_failed';
    if (msg === 'stripe_not_connected') {
      return res.status(422).json({ error: msg });
    }
    // Anything else here is treated as a client error (bad/mismatched
    // session, not yet completed, etc.) rather than a 500 — none of
    // these represent a server malfunction, just "this session doesn't
    // grant access," which is an expected, well-formed outcome.
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/puzzle-subscriptions/join-free
 * Private (supporter JWT). Enroll in a free challenge.
 * Body: { challengeId }
 */
router.post('/join-free', authenticateSupporter, async (req, res) => {
  try {
    const { challengeId } = req.body;
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const result = await joinFree({
      challengeId,
      supporterId: req.supporter_id,
      clubId:      req.club_id,
    });
    res.json(result);
  } catch (err) {
    console.error('[puzzle-subscriptions] join-free error:', err);
    if (err.message?.includes('not found') || err.message?.includes('requires payment') || err.message?.includes('cancelled')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to join challenge.' });
  }
});

/**
 * GET /api/puzzle-subscriptions/status/:challengeId
 * Private (supporter JWT). Check enrollment status.
 */
router.get('/status/:challengeId', authenticateSupporter, async (req, res) => {
  try {
    const enrollment = await getEnrollmentStatus({
      challengeId: req.params.challengeId,
      supporterId: req.supporter_id,
    });
    res.json({
      enrolled: !!enrollment,
      status:   enrollment?.status ?? null,
    });
  } catch (err) {
    console.error('[puzzle-subscriptions] status error:', err);
    res.status(500).json({ error: 'Failed to check status.' });
  }
});

/**
 * GET /api/puzzle-subscriptions/my-challenges
 * Private (supporter JWT). List all challenges for this supporter.
 */
router.get('/my-challenges', authenticateSupporter, async (req, res) => {
  try {
    const challenges = await getSupporterChallenges({
      supporterId: req.supporter_id,
      clubId:      req.club_id,
    });
    res.json(challenges);
  } catch (err) {
    console.error('[puzzle-subscriptions] my-challenges error:', err);
    res.status(500).json({ error: 'Failed to load challenges.' });
  }
});

// NOTE: a GET /join/:joinCode route (lookup by short join code) used to live
// here. It referenced a join_code column that was never added to
// fundraisely_puzzle_challenges, nothing in the codebase ever generated such
// a code, and grepping the repo for join_code/joinCode confirmed no frontend
// page links to it — it was unreachable, broken dead code. Removed rather
// than fixed, since the real, working join flow is by challengeId
// (GET /challenge/:challengeId below), which is what PuzzleJoinPage.tsx
// actually uses. If short join codes become a real feature later, this needs
// a join_code column + a generator in challengeService.createChallenge, not
// just restoring this route.

/**
 * GET /api/puzzle-subscriptions/challenge/:challengeId
 * Public. Look up a challenge by ID for the join page.
 * Used during dev/testing before join codes are generated.
 */
router.get('/challenge/:challengeId', async (req, res) => {
  try {
    const [[challenge]] = await database.connection.execute(
      `SELECT
         c.id, c.club_id, c.title, c.description, c.total_weeks,
         c.starts_at, c.weekly_price, c.currency, c.is_free, c.status,
         cl.name AS club_name
       FROM fundraisely_puzzle_challenges c
       JOIN fundraisely_clubs cl ON cl.id = c.club_id
       WHERE c.id = ? AND c.status != 'cancelled'
       LIMIT 1`,
      [req.params.challengeId]
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json(challenge);
  } catch (err) {
    console.error('[puzzle-subscriptions] challenge lookup error:', err);
    res.status(500).json({ error: 'Failed to load challenge.' });
  }
});

/**
 * GET /api/puzzle-subscriptions/schedule/:challengeId
 * Public. Returns the week schedule for a challenge.
 * Used by PlayerChallengePage — no club auth needed.
 */
router.get('/schedule/:challengeId', async (req, res) => {
  try {
    const [[challenge]] = await database.connection.execute(
      `SELECT id, total_weeks, starts_at
       FROM fundraisely_puzzle_challenges
       WHERE id = ? AND status != 'cancelled'
       LIMIT 1`,
      [req.params.challengeId]
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const [schedule] = await database.connection.execute(
      `SELECT week_number, puzzle_type, difficulty, unlocks_at
       FROM fundraisely_puzzle_schedule
       WHERE challenge_id = ?
       ORDER BY week_number ASC`,
      [req.params.challengeId]
    );

    res.json(schedule);
  } catch (err) {
    console.error('[puzzle-subscriptions] schedule error:', err);
    res.status(500).json({ error: 'Failed to load schedule.' });
  }
});

export default router;