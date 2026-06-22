// Summer Quest — Auth Routes
// Thin controllers. All real logic lives in the service files.

import express from 'express';
import { loginAdmin, SummerQuestAuthError } from '../services/SummerQuestAdminAuthService.js';
import { loginParent } from '../services/SummerQuestParentLoginService.js';
import { registerParentFromInvite, SummerQuestInviteError } from '../services/SummerQuestParentRegistrationService.js';
import { loginPlayer, SummerQuestPlayerAuthError } from '../services/SummerQuestPlayerAuthService.js';
import { summerQuestLoginRateLimit } from '../middleware/summerQuestRateLimit.js';

const router = express.Router();

router.post('/admin/login', summerQuestLoginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(req.sqPool, { email, password });
    res.json(result);
  } catch (err) {
    if (err instanceof SummerQuestAuthError) {
      return res.status(401).json({ error: err.message });
    }
    console.error('[summer-quest] admin login error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/parent/login', summerQuestLoginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginParent(req.sqPool, { email, password });
    res.json(result);
  } catch (err) {
    if (err instanceof SummerQuestAuthError) {
      return res.status(401).json({ error: err.message });
    }
    console.error('[summer-quest] parent login error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/parent/register-from-invite', async (req, res) => {
  try {
    const result = await registerParentFromInvite(req.sqPool, req.body);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof SummerQuestInviteError) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('[summer-quest] register-from-invite error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/player/login', summerQuestLoginRateLimit, async (req, res) => {
  try {
    const { teamCode, displayName, playerCode } = req.body;
    const result = await loginPlayer(req.sqPool, { teamCode, displayName, playerCode });
    res.json(result);
  } catch (err) {
    if (err instanceof SummerQuestPlayerAuthError) {
      return res.status(401).json({ error: err.message });
    }
    console.error('[summer-quest] player login error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
