// Summer Quest — Active Team Helper
// This app is single-team by design (spec section 22 lists "multiple
// teams" as nice-to-have-later, not MVP). Rather than threading teamId
// through parent/admin JWTs for a distinction that doesn't exist yet,
// routes that need a teamId but don't have one on their token (parent,
// admin) just look up the one active team here.
//
// If multi-team support is ever added, this is the one function to
// replace — everywhere else already accepts teamId as a parameter.

let cachedTeamId = null;

export async function getActiveTeamId(pool) {
  if (cachedTeamId) return cachedTeamId;

  const [rows] = await pool.execute(
    `SELECT id FROM fundraisely_tt_teams WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`
  );
  if (rows.length === 0) {
    throw new Error('No active Summer Quest team found. Check seed data ran.');
  }
  cachedTeamId = rows[0].id;
  return cachedTeamId;
}
