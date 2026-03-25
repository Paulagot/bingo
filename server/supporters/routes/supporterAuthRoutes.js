/**
 * Supporter Auth Routes
 * server/supporters/routes/supporterAuthRoutes.js
 */

import express from 'express';
import {
  findOrCreateSupporter,
  sendMagicLink,
  verifyMagicLink,
} from '../services/supporterAuthService.js';
import authenticateSupporter from '../../middleware/authenticateSupporter.js';
import database from '../../config/database.js';

const router = express.Router();

/**
 * POST /api/supporter-auth/magic-link
 * Public. Called when player submits join form or login form.
 * Body: { email, name?, challengeId?, clubId }
 */
router.post('/magic-link', async (req, res) => {
  try {
    const { email, name, challengeId, clubId } = req.body;

    if (!email)   return res.status(400).json({ error: 'email is required' });
    if (!clubId)  return res.status(400).json({ error: 'clubId is required' });

    // If no name provided this is a returning player login — look them up
    let resolvedName = name;
    if (!resolvedName) {
      const [[existing]] = await database.connection.execute(
        'SELECT name FROM fundraisely_supporters WHERE email = ? AND club_id = ? LIMIT 1',
        [email, clubId]
      );
      if (!existing) {
        // Unknown email on login attempt — don't reveal whether account exists
        // Just return success to prevent email enumeration
        return res.json({ ok: true });
      }
      resolvedName = existing.name;
    }

    const supporter = await findOrCreateSupporter({
      email,
      name: resolvedName,
      clubId,
      challengeId,
    });

    await sendMagicLink({
      supporterId: supporter.id,
      clubId,
      email,
      name:        resolvedName,
      challengeId,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[supporter-auth] magic-link error:', err);
    if (err.message?.includes('opted out')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to send magic link.' });
  }
});

/**
 * GET /api/supporter-auth/verify?token=...
 * Public. Called when player clicks magic link.
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const result = await verifyMagicLink({ token });
    res.json(result);
  } catch (err) {
    console.error('[supporter-auth] verify error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/supporter-auth/me
 * Private. Returns current supporter profile from JWT.
 */
router.get('/me', authenticateSupporter, async (req, res) => {
  try {
    const [[supporter]] = await database.connection.execute(
      `SELECT id, name, email, club_id, type, lifecycle_stage, created_at
       FROM fundraisely_supporters
       WHERE id = ? LIMIT 1`,
      [req.supporter_id]
    );
    if (!supporter) return res.status(404).json({ error: 'Supporter not found' });
    res.json(supporter);
  } catch (err) {
    console.error('[supporter-auth] me error:', err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

export default router;