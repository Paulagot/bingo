// Summer Quest — Invite Service (admin side)
// Create, list, and revoke parent invites. Only super_admin should be
// allowed to create invites — enforce that in the route, not here.

import { generateInviteToken } from './sqAuthUtils.js';

const DEFAULT_INVITE_EXPIRY_DAYS = 14;

export async function createInvite(pool, { teamId, createdByParentId, invitedEmail, invitedName }) {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + DEFAULT_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [result] = await pool.execute(
    `INSERT INTO fundraisely_tt_invites
      (team_id, invited_email, invited_name, token, status, created_by_parent_id, expires_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    [teamId, invitedEmail, invitedName || null, token, createdByParentId, expiresAt]
  );

  return {
    id: result.insertId,
    token,
    expiresAt,
  };
}

export async function listInvites(pool, { teamId }) {
  const [rows] = await pool.execute(
    `SELECT id, invited_email, invited_name, status, expires_at, accepted_at, created_at
     FROM fundraisely_tt_invites
     WHERE team_id = ?
     ORDER BY created_at DESC`,
    [teamId]
  );
  return rows;
}

export async function revokeInvite(pool, { inviteId }) {
  await pool.execute(
    `UPDATE fundraisely_tt_invites SET status = 'revoked' WHERE id = ? AND status = 'pending'`,
    [inviteId]
  );
}

export async function getInviteByToken(pool, { token }) {
  const [rows] = await pool.execute(
    `SELECT id, team_id, invited_email, invited_name, status, expires_at
     FROM fundraisely_tt_invites
     WHERE token = ?
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

export function isInviteUsable(invite) {
  if (!invite) return false;
  if (invite.status !== 'pending') return false;
  if (new Date(invite.expires_at) < new Date()) return false;
  return true;
}
