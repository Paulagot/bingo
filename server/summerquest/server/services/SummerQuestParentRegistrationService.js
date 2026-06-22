// Summer Quest — Parent Registration Service
// Handles the invite -> account -> consent -> first player flow in one
// transaction-like sequence. See spec section 6.1 and 7.

import { hashSecret, signSummerQuestToken, generatePlayerCode } from './sqAuthUtils.js';
import { getInviteByToken, isInviteUsable } from './SummerQuestInviteService.js';

export class SummerQuestInviteError extends Error {}

export async function registerParentFromInvite(pool, {
  token,
  name,
  email,
  password,
  consent,
  player, // { displayName, internalName }
}) {
  const invite = await getInviteByToken(pool, { token });
  if (!isInviteUsable(invite)) {
    throw new SummerQuestInviteError('This invite is no longer valid.');
  }

  // Required consent checkboxes — see spec section 7 "Required checkboxes".
  const requiredConsents = [
    'isParentGuardian',
    'consentChildUse',
    'consentPlayerCode',
    'consentCoachView',
    'consentDataDeletion',
  ];
  for (const field of requiredConsents) {
    if (!consent || consent[field] !== true) {
      throw new SummerQuestInviteError('All consent checkboxes are required.');
    }
  }

  const passwordHash = await hashSecret(password);

  const [parentResult] = await pool.execute(
    `INSERT INTO fundraisely_tt_parents (role, name, email, password_hash, is_active)
     VALUES ('parent', ?, ?, ?, TRUE)`,
    [name, email, passwordHash]
  );
  const parentId = parentResult.insertId;

  await pool.execute(
    `INSERT INTO fundraisely_tt_parent_consents
      (parent_id, team_id, consent_version, is_parent_guardian, consent_child_use,
       consent_player_code, consent_coach_view, consent_data_deletion, signed_name)
     VALUES (?, ?, 'v1', TRUE, TRUE, TRUE, TRUE, TRUE, ?)`,
    [parentId, invite.team_id, consent.signedName || name]
  );

  // Generate or accept a player code. If the parent didn't supply one,
  // generate a kid-friendly one (see sqAuthUtils.generatePlayerCode).
  const rawPlayerCode = player.playerCode || generatePlayerCode();
  const playerCodeHash = await hashSecret(rawPlayerCode);

  const [playerResult] = await pool.execute(
    `INSERT INTO fundraisely_tt_players
      (team_id, parent_id, display_name, internal_name, player_code_hash, is_active)
     VALUES (?, ?, ?, ?, ?, TRUE)`,
    [invite.team_id, parentId, player.displayName, player.internalName || null, playerCodeHash]
  );

  await pool.execute(
    `UPDATE fundraisely_tt_invites SET status = 'accepted', accepted_by_parent_id = ?, accepted_at = NOW() WHERE id = ?`,
    [parentId, invite.id]
  );

  const authToken = signSummerQuestToken({ sqRole: 'parent', sqId: parentId });

  return {
    token: authToken,
    parent: { id: parentId, name, email },
    player: {
      id: playerResult.insertId,
      displayName: player.displayName,
      // Returned ONCE here so the parent can write it down / share with
      // their child. Never returned again after this response — see
      // spec section 18 "Never return player code."
      playerCode: rawPlayerCode,
    },
  };
}
