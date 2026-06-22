// Summer Quest — Parent Login Service
// Returning parent login. Registration (first-time, via invite) lives
// in SummerQuestParentRegistrationService.js — kept separate since
// they're different flows with different inputs/validation.

import { compareSecret, signSummerQuestToken } from './sqAuthUtils.js';
import { SummerQuestAuthError } from './SummerQuestAdminAuthService.js';

export async function loginParent(pool, { email, password }) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password_hash, is_active
     FROM fundraisely_tt_parents
     WHERE email = ? AND role = 'parent'
     LIMIT 1`,
    [email]
  );

  const parent = rows[0];
  if (!parent || !parent.is_active) {
    throw new SummerQuestAuthError('Invalid email or password.');
  }

  const passwordOk = await compareSecret(password, parent.password_hash);
  if (!passwordOk) {
    throw new SummerQuestAuthError('Invalid email or password.');
  }

  const token = signSummerQuestToken({ sqRole: 'parent', sqId: parent.id });

  return {
    token,
    profile: { id: parent.id, name: parent.name, email: parent.email },
  };
}
