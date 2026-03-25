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
import database from '../../config/database.js';

const router = express.Router();

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

/**
 * GET /api/puzzle-subscriptions/join/:joinCode
 * Public. Look up a challenge by its short join code.
 * Returns enough info to render the join page.
 */
router.get('/join/:joinCode', async (req, res) => {
  try {
    const [[challenge]] = await database.connection.execute(
      `SELECT
         c.id, c.club_id, c.title, c.description, c.total_weeks,
         c.starts_at, c.weekly_price, c.currency, c.is_free, c.status,
         cl.name AS club_name
       FROM fundraisely_puzzle_challenges c
       JOIN fundraisely_clubs cl ON cl.id = c.club_id
       WHERE c.join_code = ? AND c.status != 'cancelled'
       LIMIT 1`,
      [req.params.joinCode]
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json(challenge);
  } catch (err) {
    console.error('[puzzle-subscriptions] join code error:', err);
    res.status(500).json({ error: 'Failed to load challenge.' });
  }
});

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