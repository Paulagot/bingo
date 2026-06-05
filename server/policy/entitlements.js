// server/policy/entitlements.js
import { connection } from '../config/database.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Fallback used when DB is unreachable or club/plan is missing.
 * Deliberately restrictive so failures don't accidentally grant access.
 */
const FALLBACK_FREE_PLAN = {
  max_players_per_game: 20,
  max_rounds: 30,
  round_types_allowed: ['*'],
  extras_allowed: ['*'],
  concurrent_rooms: 1,
  game_credits_remaining: 0,
};

/**
 * Credit key logic by plan code:
 *
 *   FREE  → siloed per game type  (credit_key = scope, e.g. 'quiz' | 'elimination')
 *           Lifetime — reset_at is NULL, never resets.
 *
 *   GROWTH / PRO → single pooled bucket (credit_key = 'games')
 *           Monthly — reset_at is set; lazy reset applied on consume.
 *
 *   DEV   → pooled 'games' bucket, balance=999999, reset_at NULL (never resets)
 *
 * TODO: when adding a new game type, seed a new credit_key row for FREE clubs
 *       (migration + grantCredits call). GROWTH/PRO/DEV use the shared 'games'
 *       bucket automatically — no migration needed for those.
 */
const POOLED_PLANS = new Set(['GROWTH', 'PRO', 'DEV']);

/**
 * Default monthly credit allowance per plan (used on lazy reset).
 * FREE is not here — it never resets.
 */
const MONTHLY_CREDITS = {
  GROWTH: 8,
  PRO: 20,
  DEV: 999999,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseSafe(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  if (typeof value === 'object') return value; // mysql2 may already parse JSON
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isWildcardArray(arr) {
  return Array.isArray(arr) && arr.includes('*');
}

/**
 * Determine which credit_key to use for a given club/scope combination.
 * FREE uses the scope name directly; all other plans use the shared 'games' pool.
 */
function creditKeyForScope(planCode, scope) {
  if (planCode === 'FREE') return scope; // 'quiz' | 'elimination' | future game
  return 'games';
}

/**
 * Build a scope-aware entitlements object from plan_entitlements rows.
 * Always returns the v1-compatible shape so nothing in the existing codebase breaks.
 *
 * @param {Array}  rows   - rows from fundraisely_plan_entitlements
 * @param {string} scope  - 'quiz' | 'elimination' | future game type
 */
function buildEntitlementsFromRows(rows, scope) {
  // Buckets for the requested game scope
  const gameCaps        = {};
  const gameAllowed     = {};
  const gamePermissions = {};
  const gameFeatures    = {};

  // mgt scope (always loaded regardless of requested scope)
  const mgtFeatures = {};
  const mgtLimits   = {};

  for (const r of rows) {
    const val = parseSafe(r.value_json, {});

    if (r.scope === scope) {
      if (r.key === 'caps')        Object.assign(gameCaps,        val);
      if (r.key === 'allowed')     Object.assign(gameAllowed,     val);
      if (r.key === 'permissions') Object.assign(gamePermissions, val);
      if (r.key === 'features')    Object.assign(gameFeatures,    val);
    }

    if (r.scope === 'mgt') {
      if (r.key === 'features') Object.assign(mgtFeatures, val);
      if (r.key === 'limits')   Object.assign(mgtLimits,   val);
    }
  }

  // v1-compatible field names (quiz originally drove this shape)
  const roundTypes = gameAllowed.roundTypes ?? ['*'];
  const extras     = gameAllowed.extras     ?? ['*'];

  return {
    // Core caps — v1 field names preserved
    max_players_per_game: Number(gameCaps.maxPlayers     ?? FALLBACK_FREE_PLAN.max_players_per_game),
    max_rounds:           Number(gameCaps.maxRounds      ?? FALLBACK_FREE_PLAN.max_rounds),
    concurrent_rooms:     Number(gameCaps.concurrentRooms ?? FALLBACK_FREE_PLAN.concurrent_rooms),

    // Allowed types / extras
    round_types_allowed: isWildcardArray(roundTypes) ? ['*'] : roundTypes,
    extras_allowed:      isWildcardArray(extras)     ? ['*'] : extras,

    // Game-specific features (quiz_features kept for backwards compat)
    quiz_features:  scope === 'quiz' ? gameFeatures : {},
    game_features:  gameFeatures,       // generic key for non-quiz scopes
    game_permissions: gamePermissions,

    // Management
    mgt: { features: mgtFeatures, limits: mgtLimits },
  };
}

/**
 * Load and merge per-club entitlement overrides from
 * fundraisely_club_entitlement_overrides for the requested scope.
 *
 * Overrides replace individual keys inside the entitlements object.
 * e.g. a Game Pass row might override max_players_per_game for 'elimination'.
 *
 * NOTE: the old club_plan.overrides JSON blob is intentionally no longer
 * applied here — use the proper overrides table going forward.
 */
async function applyOverrides(entitlements, clubId, scope) {
  try {
    const [rows] = await connection.execute(`
      SELECT \`key\`, value_json
      FROM fundraisely_club_entitlement_overrides
      WHERE club_id = ? AND scope = ?
    `, [clubId, scope]);

    if (!Array.isArray(rows) || rows.length === 0) return entitlements;

    const merged = { ...entitlements };
    for (const row of rows) {
      const val = parseSafe(row.value_json, null);
      if (val !== null) {
        merged[row.key] = val;
      }
    }

    console.log(`[Entitlements] 🔧 Applied ${rows.length} override(s) for club "${clubId}" scope "${scope}"`);
    return merged;
  } catch (err) {
    // Overrides are non-critical — log and continue with base entitlements
    console.error(`[Entitlements] ⚠️ Failed to load overrides for club "${clubId}":`, err);
    return entitlements;
  }
}

// ---------------------------------------------------------------------------
// Public: resolveEntitlements
// ---------------------------------------------------------------------------

/**
 * Resolve full entitlements for a club, scoped to a specific game type.
 *
 * @param {object} params
 * @param {string} params.userId  - club ID (named userId for backwards compat)
 * @param {string} [params.scope] - 'quiz' | 'elimination' | future game (default: 'quiz')
 *
 * @returns {object} v1-compatible entitlements object including:
 *   - max_players_per_game, max_rounds, concurrent_rooms
 *   - round_types_allowed, extras_allowed
 *   - quiz_features / game_features
 *   - game_credits_remaining  (from club_credit_balances for the resolved credit key)
 *   - credit_key              (which bucket was used)
 *   - plan_id, plan_code
 */
export async function resolveEntitlements({ userId: clubId, scope = 'quiz' }) {
  if (!clubId) {
    console.warn('[Entitlements] ⚠️ No clubId provided, using fallback');
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK', scope, credit_key: scope };
  }
  if (!connection) {
    console.error('[Entitlements] ❌ Database connection not available');
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK', scope, credit_key: scope };
  }

  try {
    // 1) Load club + plan
    const [clubRows] = await connection.execute(`
      SELECT
        c.id       AS club_id,
        c.name     AS club_name,
        p.id       AS plan_id,
        p.code     AS plan_code
      FROM fundraisely_clubs c
      LEFT JOIN fundraisely_club_plan cp ON c.id  = cp.club_id
      LEFT JOIN fundraisely_plans     p  ON cp.plan_id = p.id
      WHERE c.id = ?
      LIMIT 1
    `, [clubId]);

    if (!Array.isArray(clubRows) || clubRows.length === 0) {
      console.warn(`[Entitlements] ⚠️ Club "${clubId}" not found, using fallback`);
      return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK', scope, credit_key: scope };
    }

    const club = clubRows[0];

    if (!club.plan_id) {
      console.warn(`[Entitlements] ⚠️ Club "${clubId}" has no plan, using fallback`);
      return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK', scope, credit_key: scope };
    }

    // 2) Load plan_entitlements rows (all scopes — we filter in buildEntitlementsFromRows)
    const [entRows] = await connection.execute(`
      SELECT scope, \`key\`, value_json
      FROM fundraisely_plan_entitlements
      WHERE plan_id = ?
    `, [club.plan_id]);

    let base;

    if (Array.isArray(entRows) && entRows.length > 0) {
      base = buildEntitlementsFromRows(entRows, scope);
      console.log(`[Entitlements] ✅ Resolved plan_entitlements for plan_id=${club.plan_id} (${club.plan_code}) scope="${scope}"`);
    } else {
      // Fallback to legacy fundraisely_plans columns if no entitlement rows exist
      console.warn(`[Entitlements] ⚠️ No plan_entitlements rows for plan_id=${club.plan_id} — falling back to plans table`);
      const [planRows] = await connection.execute(`
        SELECT max_players_per_game, max_rounds, concurrent_rooms,
               round_types_allowed, extras_allowed
        FROM fundraisely_plans WHERE id = ? LIMIT 1
      `, [club.plan_id]);

      const p = planRows?.[0];
      base = {
        max_players_per_game: Number(p?.max_players_per_game ?? FALLBACK_FREE_PLAN.max_players_per_game),
        max_rounds:           Number(p?.max_rounds           ?? FALLBACK_FREE_PLAN.max_rounds),
        concurrent_rooms:     Number(p?.concurrent_rooms     ?? FALLBACK_FREE_PLAN.concurrent_rooms),
        round_types_allowed:  parseSafe(p?.round_types_allowed, FALLBACK_FREE_PLAN.round_types_allowed),
        extras_allowed:       parseSafe(p?.extras_allowed,      FALLBACK_FREE_PLAN.extras_allowed),
        quiz_features:        {},
        game_features:        {},
        game_permissions:     {},
        mgt:                  { features: {}, limits: {} },
      };
    }

    // 3) Resolve credit balance from club_credit_balances
    const creditKey = creditKeyForScope(club.plan_code, scope);
    const creditsRemaining = await getCreditBalance(clubId, creditKey);

    // 4) Assemble final object
    let entitlements = {
      plan_id:   club.plan_id,
      plan_code: club.plan_code,
      scope,
      credit_key: creditKey,
      ...base,
      game_credits_remaining: creditsRemaining,
      // quiz_features already set inside base; keep for backwards compat
      quiz_features: base.quiz_features || {},
    };

    // 5) Apply per-club overrides from fundraisely_club_entitlement_overrides
    entitlements = await applyOverrides(entitlements, clubId, scope);

    console.log(`[Entitlements] 👤 Club "${clubId}" | plan=${entitlements.plan_code} | scope=${scope} | credits=${creditsRemaining} (key=${creditKey}) | maxPlayers=${entitlements.max_players_per_game}`);

    return entitlements;
  } catch (error) {
    console.error(`[Entitlements] ❌ DB error for club "${clubId}" scope "${scope}":`, error);
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK', scope, credit_key: scope };
  }
}

// ---------------------------------------------------------------------------
// Public: checkCaps
// ---------------------------------------------------------------------------

/**
 * Validate requested game config against resolved entitlements.
 * Works for any scope — round type checking only applies when ents has
 * a non-wildcard round_types_allowed (currently quiz only).
 *
 * @param {object} ents              - result of resolveEntitlements()
 * @param {object} params
 * @param {number} params.requestedPlayers
 * @param {number} [params.requestedRounds]
 * @param {string[]} [params.roundTypes]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkCaps(ents, { requestedPlayers, requestedRounds, roundTypes }) {
  const maxPlayers = ents.max_players_per_game ?? FALLBACK_FREE_PLAN.max_players_per_game;
  const maxRounds  = ents.max_rounds           ?? FALLBACK_FREE_PLAN.max_rounds;

  if (requestedPlayers > maxPlayers) {
    return {
      ok: false,
      reason: `Your plan allows up to ${maxPlayers} players per game. ` +
              `Upgrade to a higher plan for more.`,
    };
  }

  if (requestedRounds && requestedRounds > maxRounds) {
    return {
      ok: false,
      reason: `Your plan allows up to ${maxRounds} rounds per game.`,
    };
  }

  // Round type check — only meaningful for quiz; elimination has no roundTypes
  if (roundTypes && roundTypes.length > 0) {
    const allowed = new Set(ents.round_types_allowed ?? []);
    if (!allowed.has('*')) {
      const disallowed = roundTypes.filter(rt => !allowed.has(rt));
      if (disallowed.length > 0) {
        return {
          ok: false,
          reason: `Round types not allowed on your plan: ${disallowed.join(', ')}. ` +
                  `Allowed: ${Array.from(allowed).join(', ')}`,
        };
      }
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Public: getCreditBalance
// ---------------------------------------------------------------------------

/**
 * Read the current credit balance for a club + credit key.
 * Does NOT perform a lazy reset — call consumeCredit for that.
 *
 * @param {string} clubId
 * @param {string} creditKey - 'quiz' | 'elimination' | 'games'
 * @returns {Promise<number>}
 */
export async function getCreditBalance(clubId, creditKey) {
  try {
    const [rows] = await connection.execute(`
      SELECT balance, reset_at
      FROM fundraisely_club_credit_balances
      WHERE club_id = ? AND credit_key = ?
      LIMIT 1
    `, [clubId, creditKey]);

    if (!Array.isArray(rows) || rows.length === 0) return 0;
    return Number(rows[0].balance ?? 0);
  } catch (err) {
    console.error(`[Credits] ❌ getCreditBalance failed for club "${clubId}" key "${creditKey}":`, err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Public: consumeCredit
// ---------------------------------------------------------------------------

/**
 * Consume one credit for a club + game scope.
 *
 * Handles:
 *   - Lazy monthly reset for GROWTH/PRO/DEV (reset_at in a past month)
 *   - Correct credit_key resolution (FREE = scope, others = 'games')
 *   - Hard block when balance is zero
 *
 * // TODO: replace hard block with top-up / upgrade flow when billing is ready.
 *          At that point return { ok: false, reason: 'no_credits', upgradeAvailable: true }
 *          and let the caller decide whether to show an upgrade prompt or a paywall.
 *
 * @param {string} clubId
 * @param {string} scope  - 'quiz' | 'elimination' | future game type
 * @param {string} planCode - club's current plan code (from resolveEntitlements)
 * @returns {Promise<{ ok: boolean, reason?: string, upgradeUrl?: string }>}
 */
export async function consumeCredit(clubId, scope, planCode) {
  const creditKey = creditKeyForScope(planCode, scope);

  try {
    // 1) Load the current balance row
    const [rows] = await connection.execute(`
      SELECT balance, reset_at
      FROM fundraisely_club_credit_balances
      WHERE club_id = ? AND credit_key = ?
      LIMIT 1
    `, [clubId, creditKey]);

    if (!Array.isArray(rows) || rows.length === 0) {
      console.warn(`[Credits] ⚠️ No credit row for club "${clubId}" key "${creditKey}" — blocking`);
      return {
        ok: false,
        reason: 'no_credits',
        message: 'No credits available. Please contact support.',
        upgradeUrl: '/settings/billing',
      };
    }

    const row = rows[0];
    let balance = Number(row.balance ?? 0);
    const resetAt = row.reset_at ? new Date(row.reset_at) : null;
    const now = new Date();

    // 2) Lazy monthly reset — applies to GROWTH/PRO/DEV only (reset_at is NOT NULL)
    if (resetAt !== null && resetAt <= now) {
      const monthlyAllowance = MONTHLY_CREDITS[planCode] ?? 0;
      const nextResetAt = firstDayOfNextMonth();

      console.log(`[Credits] 🔄 Resetting credits for club "${clubId}" key="${creditKey}" plan=${planCode} → ${monthlyAllowance} credits`);

      await connection.execute(`
        UPDATE fundraisely_club_credit_balances
        SET balance    = ?,
            reset_at   = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE club_id = ? AND credit_key = ?
      `, [monthlyAllowance, nextResetAt, clubId, creditKey]);

      balance = monthlyAllowance;
    }

    // 3) Hard block if no credits remaining
    if (balance <= 0) {
      const isPooled = POOLED_PLANS.has(planCode);
      const message = isPooled
        ? `You've used all your credits for this month. Upgrade to Pro for more.`
        : `You've used your lifetime credit for ${scope}. Upgrade your plan to run more games.`;

      console.log(`[Credits] 🚫 No credits for club "${clubId}" key="${creditKey}" (balance=${balance})`);

      return {
        ok: false,
        reason: 'no_credits',
        message,
        upgradeUrl: '/settings/billing',
      };
    }

    // 4) Atomic decrement
    const [result] = await connection.execute(`
      UPDATE fundraisely_club_credit_balances
      SET balance    = balance - 1,
          updated_at = UTC_TIMESTAMP()
      WHERE club_id    = ?
        AND credit_key = ?
        AND balance    > 0
    `, [clubId, creditKey]);

    if (result.affectedRows === 0) {
      // Race condition — another request consumed the last credit
      console.warn(`[Credits] ⚠️ Race condition on consume for club "${clubId}" key="${creditKey}"`);
      return {
        ok: false,
        reason: 'no_credits',
        message: `You've used all your available credits. Upgrade your plan for more.`,
        upgradeUrl: '/settings/billing',
      };
    }

    console.log(`[Credits] ✅ Consumed 1 credit for club "${clubId}" key="${creditKey}" (was ${balance}, now ${balance - 1})`);
    return { ok: true };

  } catch (error) {
    console.error(`[Credits] ❌ consumeCredit failed for club "${clubId}" scope "${scope}":`, error);
    // Fail open on unexpected DB errors so a server crash doesn't block all games
    // TODO: consider failing closed here once the system is proven stable
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Public: grantCredits
// ---------------------------------------------------------------------------

/**
 * Grant additional credits to a club for a specific credit key.
 * Used for top-ups, game passes, admin grants, etc.
 *
 * @param {string} clubId
 * @param {string} creditKey - 'quiz' | 'elimination' | 'games'
 * @param {number} amount
 * @returns {Promise<boolean>}
 */
export async function grantCredits(clubId, creditKey, amount) {
  try {
    // Upsert — if the row doesn't exist yet (e.g. new game type on FREE plan),
    // create it. If it does exist, add to the balance.
    const [result] = await connection.execute(`
      INSERT INTO fundraisely_club_credit_balances (club_id, credit_key, balance, reset_at, updated_at)
      VALUES (?, ?, ?, NULL, UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE
        balance    = balance + VALUES(balance),
        updated_at = UTC_TIMESTAMP()
    `, [clubId, creditKey, amount]);

    if (result.affectedRows === 0) return false;

    console.log(`[Credits] ✅ Granted ${amount} credits to club "${clubId}" key="${creditKey}"`);
    return true;
  } catch (error) {
    console.error(`[Credits] ❌ grantCredits failed for club "${clubId}" key "${creditKey}":`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public: hasGameFeature
// ---------------------------------------------------------------------------

/**
 * Check whether an entitlements object includes a specific feature flag.
 * Works for any scope — checks game_features first, then quiz_features for
 * backwards compatibility.
 *
 * @param {object} entitlements - result of resolveEntitlements()
 * @param {string} featureKey   - e.g. 'eventLinking', 'ticketing', 'payments'
 * @returns {boolean}
 */
export function hasGameFeature(entitlements, featureKey) {
  if (!entitlements) return false;
  const features =
    entitlements.game_features  ||
    entitlements.quiz_features  ||
    entitlements.quizFeatures   ||  // legacy key
    {};
  return features[featureKey] === true;
}

/**
 * Backwards-compatible alias — existing callers use hasQuizFeature.
 * Points to hasGameFeature so both work.
 */
export const hasQuizFeature = hasGameFeature;

// ---------------------------------------------------------------------------
// Public: canUseTemplate
// ---------------------------------------------------------------------------

/**
 * Only DEV plan can use the 'demo-quiz' template.
 * All other templates are open to any plan.
 */
export function canUseTemplate(entitlements, templateId) {
  if (templateId === 'demo-quiz') {
    return entitlements?.plan_id === 2 || entitlements?.plan_code === 'DEV';
  }
  return true;
}

// ---------------------------------------------------------------------------
// Internal: date helper
// ---------------------------------------------------------------------------

/**
 * Returns the first day of next calendar month as a MySQL-compatible
 * datetime string, e.g. '2026-07-01 00:00:00'.
 */
function firstDayOfNextMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCHours(0, 0, 0, 0);
  // Format as 'YYYY-MM-DD HH:MM:SS'
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

