// Summer Quest — Player Login Service
//
// Deliberately simple and fully separate from any magic-link/email auth
// elsewhere in Fundraisely (per your decision). No email. No password.
// Just: team code (which team/programme) + display name + player code.
//
// Player codes are short (4 chars) and hashed at rest (bcrypt), same as
// a PIN. Brute-force risk is mitigated by rate limiting on the route
// (see middleware) rather than code length, to keep this kid-friendly.

import { compareSecret, signSummerQuestToken } from './sqAuthUtils.js';

export class SummerQuestPlayerAuthError extends Error {}

export async function loginPlayer(pool, { teamCode, displayName, playerCode }) {
  const [teamRows] = await pool.execute(
    `SELECT id FROM fundraisely_tt_teams WHERE team_code = ? AND is_active = TRUE LIMIT 1`,
    [teamCode]
  );
  const team = teamRows[0];
  if (!team) {
    throw new SummerQuestPlayerAuthError('Team code not recognised.');
  }

  const [playerRows] = await pool.execute(
    `SELECT id, display_name, player_code_hash, is_active
     FROM fundraisely_tt_players
     WHERE team_id = ? AND display_name = ?
     LIMIT 1`,
    [team.id, displayName]
  );
  const player = playerRows[0];
  if (!player || !player.is_active) {
    throw new SummerQuestPlayerAuthError('Player not found. Check the name and try again.');
  }

  const codeOk = await compareSecret(playerCode, player.player_code_hash);
  if (!codeOk) {
    throw new SummerQuestPlayerAuthError('Incorrect player code.');
  }

  const token = signSummerQuestToken({ sqRole: 'player', sqId: player.id, sqTeamId: team.id });

  return {
    token,
    profile: { id: player.id, displayName: player.display_name },
  };
}
