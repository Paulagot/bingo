// Summer Quest — Admin Auth Service
// Handles super_admin and coach_admin login only. Both roles live in
// fundraisely_tt_parents (see schema note) distinguished by `role`.

import { compareSecret, signSummerQuestToken } from './sqAuthUtils.js';

export async function loginAdmin(pool, { email, password }) {
  const [rows] = await pool.execute(
    `SELECT id, role, name, email, password_hash, is_active
     FROM fundraisely_tt_parents
     WHERE email = ? AND role IN ('super_admin', 'coach_admin')
     LIMIT 1`,
    [email]
  );

  const admin = rows[0];
  if (!admin || !admin.is_active) {
    throw new SummerQuestAuthError('Invalid email or password.');
  }

  const passwordOk = await compareSecret(password, admin.password_hash);
  if (!passwordOk) {
    throw new SummerQuestAuthError('Invalid email or password.');
  }

  const token = signSummerQuestToken({
    sqRole: admin.role,
    sqId: admin.id,
  });

  return {
    token,
    profile: {
      id: admin.id,
      role: admin.role,
      name: admin.name,
      email: admin.email,
    },
  };
}

export class SummerQuestAuthError extends Error {}
