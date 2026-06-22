// Summer Quest — Admin Invite Routes
// Only super_admin may create/revoke invites (spec section 5.1), and
// only super_admin may create coach_admin accounts.
//
// IMPORTANT: auth/role middleware is applied PER-ROUTE here, not via
// router.use(...) at the top. This router and
// summerQuestAdminDashboardRoutes.js both mount at /admin — a
// router-wide router.use(requireSummerQuestRole(['super_admin']))
// would run for EVERY request that enters this router, including
// paths this router has no actual route for (like /dashboard), and
// would reject a coach_admin with 403 BEFORE Express ever got a chance
// to fall through to the other /admin router that allows coach_admin.
// Middleware runs on path-prefix match regardless of whether a route
// matches further down; only an actually-unmatched ROUTE falls
// through to the next router. Scoping the middleware to each
// individual route avoids this.

import express from 'express';
import { summerQuestAuthMiddleware, requireSummerQuestRole } from '../middleware/summerQuestAuth.js';
import { createInvite, listInvites, revokeInvite } from '../services/SummerQuestInviteService.js';
import { getActiveTeamId } from '../services/sqActiveTeam.js';
import { hashSecret } from '../services/sqAuthUtils.js';

const router = express.Router();

const requireSuperAdmin = [summerQuestAuthMiddleware, requireSummerQuestRole(['super_admin'])];

router.post('/invites', requireSuperAdmin, async (req, res) => {
  try {
    const { invitedEmail, invitedName } = req.body;
    const teamId = await getActiveTeamId(req.sqPool);
    const invite = await createInvite(req.sqPool, {
      teamId,
      createdByParentId: req.sqAuth.sqId,
      invitedEmail,
      invitedName,
    });
    res.status(201).json(invite);
  } catch (err) {
    console.error('[summer-quest] create invite error:', err);
    res.status(500).json({ error: 'Could not create invite.' });
  }
});

router.get('/invites', requireSuperAdmin, async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const invites = await listInvites(req.sqPool, { teamId });
    res.json(invites);
  } catch (err) {
    console.error('[summer-quest] list invites error:', err);
    res.status(500).json({ error: 'Could not load invites.' });
  }
});

router.patch('/invites/:id/revoke', requireSuperAdmin, async (req, res) => {
  try {
    await revokeInvite(req.sqPool, { inviteId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    console.error('[summer-quest] revoke invite error:', err);
    res.status(500).json({ error: 'Could not revoke invite.' });
  }
});

// Coach accounts — super_admin only, no self-serve signup anywhere
// (spec section 5.1: only Super Admin can invite/create users).
router.post('/coaches', requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are all required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const passwordHash = await hashSecret(password);
    await req.sqPool.execute(
      `INSERT INTO fundraisely_tt_parents (role, name, email, password_hash, is_active)
       VALUES ('coach_admin', ?, ?, ?, TRUE)`,
      [name, email, passwordHash]
    );
    res.status(201).json({ ok: true, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('[summer-quest] create coach error:', err);
    res.status(500).json({ error: 'Could not create coach account.' });
  }
});

router.get('/coaches', requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await req.sqPool.execute(
      `SELECT id, name, email, is_active, created_at FROM fundraisely_tt_parents WHERE role = 'coach_admin' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[summer-quest] list coaches error:', err);
    res.status(500).json({ error: 'Could not load coaches.' });
  }
});

export default router;
