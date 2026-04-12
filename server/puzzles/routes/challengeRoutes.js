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

    const challenge = await createChallenge({
      clubId, title, description, totalWeeks, startsAt, puzzleSchedule,
      isFree: Boolean(isFree),
      weeklyPrice,
      currency,
    });
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
    if (err.message?.startsWith('Invalid status')) return res.status(400).json({ error: err.message });
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