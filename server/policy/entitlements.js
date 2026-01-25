// server/policy/entitlements.js
import { connection } from '../config/database.js';

// Keep your fallback exactly as today (or tweak later)
const FALLBACK_FREE_PLAN = {
  max_players_per_game: 3,
  max_rounds: 8,
  round_types_allowed: ['general_trivia', 'wipeout', 'speed_round'],
  extras_allowed: ['buyHint', 'restorePoints', 'freezeOutTeam', 'robPoints'],
  concurrent_rooms: 1,
  game_credits_remaining: 3,
};

function parseSafe(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  if (typeof value === 'object') return value; // already parsed JSON (mysql2 can do this sometimes)
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
 * Build a "v1-shaped" entitlements object from v2 plan_entitlements rows
 * rows: [{ scope, key, value_json }]
 */
function buildLegacyFromV2Rows(rows) {
  // We only care about quiz scope for now, but we’ll also return mgt under `mgt` if you want later.
  const quizCaps = {};
  const quizAllowed = {};
  const quizPermissions = {};
  const mgtFeatures = {};
  const mgtLimits = {};
  const quizFeatures = {};

  for (const r of rows) {
    const scope = r.scope;
    const key = r.key;
    const val = parseSafe(r.value_json, {});

    if (scope === 'quiz' && key === 'caps') Object.assign(quizCaps, val);
    if (scope === 'quiz' && key === 'allowed') Object.assign(quizAllowed, val);
    if (scope === 'quiz' && key === 'permissions') Object.assign(quizPermissions, val);
    if (scope === 'quiz' && key === 'features') Object.assign(quizFeatures, val);


    if (scope === 'mgt' && key === 'features') Object.assign(mgtFeatures, val);
    if (scope === 'mgt' && key === 'limits') Object.assign(mgtLimits, val);
  }

  // Map v2 shape -> v1 keys (what your frontend expects today)
  const roundTypes = quizAllowed.roundTypes ?? [];
  const extras = quizAllowed.extras ?? [];

  return {
    // v1 expected fields:
    max_players_per_game: Number(quizCaps.maxPlayers ?? 0),
    max_rounds: Number(quizCaps.maxRounds ?? 0),
    concurrent_rooms: Number(quizCaps.concurrentRooms ?? 0),
    round_types_allowed: isWildcardArray(roundTypes) ? ['*'] : roundTypes,
    extras_allowed: isWildcardArray(extras) ? ['*'] : extras,
    quiz_features: quizFeatures,

    // Keep v2 data available if you want later (safe additive, doesn’t break)
    // If you want zero payload risk, delete these 2 lines:
    mgt: { features: mgtFeatures, limits: mgtLimits },
    quiz_permissions: quizPermissions,
  };
}

/** Tiny helper: only Dev plan (id=2) can use demo-quiz */
export function canUseTemplate(entitlements, templateId) {
  if (templateId === 'demo-quiz') {
    return entitlements?.plan_id === 2 || entitlements?.plan_code === 'DEV';
  }
  return true;
}

/**
 * Resolve entitlements for a club
 * (v2-backed but returns v1 shape so nothing breaks)
 */
export async function resolveEntitlements({ userId: clubId }) {
  if (!clubId) {
    console.warn('[Entitlements] ⚠️ No clubId provided, using fallback');
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
  }
  if (!connection) {
    console.error('[Entitlements] ❌ Database connection not available');
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
  }

  try {
    // 1) Load club + plan_id + plan_code + credits (same as v1)
    const [clubRows] = await connection.execute(`
      SELECT 
        c.id as club_id,
        c.name as club_name,
        p.id   as plan_id,
        p.code as plan_code,
        cp.game_credits_remaining,
        cp.overrides
      FROM fundraisely_clubs c
      LEFT JOIN fundraisely_club_plan cp ON c.id = cp.club_id
      LEFT JOIN fundraisely_plans     p  ON cp.plan_id = p.id
      WHERE c.id = ?
      LIMIT 1
    `, [clubId]);

    if (!Array.isArray(clubRows) || clubRows.length === 0) {
      console.warn(`[Entitlements] ⚠️ Club "${clubId}" not found, using fallback`);
      return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
    }

    const club = clubRows[0];
    if (!club.plan_id) {
      console.warn(`[Entitlements] ⚠️ Club "${clubId}" has no plan assigned, using fallback`);
      return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
    }

    // 2) Try to load v2 plan_entitlements
    const [entRows] = await connection.execute(`
      SELECT scope, \`key\`, value_json
      FROM fundraisely_plan_entitlements
      WHERE plan_id = ?
    `, [club.plan_id]);

    let base;
    if (Array.isArray(entRows) && entRows.length > 0) {
      base = buildLegacyFromV2Rows(entRows);

      // If seed is incomplete, fall back for missing quiz caps
      if (!base.max_players_per_game) base.max_players_per_game = FALLBACK_FREE_PLAN.max_players_per_game;
      if (!base.max_rounds) base.max_rounds = FALLBACK_FREE_PLAN.max_rounds;
      if (!base.concurrent_rooms) base.concurrent_rooms = FALLBACK_FREE_PLAN.concurrent_rooms;
      if (!Array.isArray(base.round_types_allowed) || base.round_types_allowed.length === 0) base.round_types_allowed = FALLBACK_FREE_PLAN.round_types_allowed;
      if (!Array.isArray(base.extras_allowed) || base.extras_allowed.length === 0) base.extras_allowed = FALLBACK_FREE_PLAN.extras_allowed;

      console.log(`[EntitlementsV2] ✅ Using fundraisely_plan_entitlements for plan_id=${club.plan_id} (${club.plan_code})`);
    } else {
      // 3) Fallback to v1 plan table if v2 rows missing
      console.warn(`[EntitlementsV2] ⚠️ No plan_entitlements rows found for plan_id=${club.plan_id} (${club.plan_code}); falling back to v1 plan table`);

      const [planRows] = await connection.execute(`
        SELECT 
          max_players_per_game,
          max_rounds,
          concurrent_rooms,
          round_types_allowed,
          extras_allowed
        FROM fundraisely_plans
        WHERE id = ?
        LIMIT 1
      `, [club.plan_id]);

      const p = planRows?.[0];
      base = {
        max_players_per_game: Number(p?.max_players_per_game ?? FALLBACK_FREE_PLAN.max_players_per_game),
        max_rounds: Number(p?.max_rounds ?? FALLBACK_FREE_PLAN.max_rounds),
        concurrent_rooms: Number(p?.concurrent_rooms ?? FALLBACK_FREE_PLAN.concurrent_rooms),
        round_types_allowed: parseSafe(p?.round_types_allowed, FALLBACK_FREE_PLAN.round_types_allowed),
        extras_allowed: parseSafe(p?.extras_allowed, FALLBACK_FREE_PLAN.extras_allowed),
      };
    }

    // 4) Build final entitlements (v1-compatible)
    const entitlements = {
      plan_id: club.plan_id,
      plan_code: club.plan_code,
      ...base,
      game_credits_remaining: Number(club.game_credits_remaining ?? 0),
       quiz_features: base.quiz_features || {},
    };

      console.log('🔍 [Entitlements] Returning:', {
    plan_id: entitlements.plan_id,
    plan_code: entitlements.plan_code,
    quiz_features: entitlements.quiz_features,
    hasEventLinking: entitlements.quiz_features?.eventLinking,
  });

    // 5) Apply overrides (still supported)
    const overrides = parseSafe(club.overrides, null);
    if (overrides && typeof overrides === 'object') {
      Object.assign(entitlements, overrides);
    }

    console.log(`[Entitlements] 👤 Club "${clubId}" on "${entitlements.plan_code}" plan - ${entitlements.game_credits_remaining} credits remaining`);
    return entitlements;
  } catch (error) {
    console.error(`[Entitlements] ❌ Database error for club "${clubId}":`, error);
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
  }
}

/**
 * Check caps (keep your current implementation)
 */
export function checkCaps(ents, { requestedPlayers, requestedRounds, roundTypes }) {
  const maxPlayers = ents.max_players_per_game ?? 20;
  const maxRounds = ents.max_rounds ?? 8;

  if (requestedPlayers > maxPlayers) {
    return { ok: false, reason: `Your plan allows up to ${maxPlayers} players` };
  }
  if (requestedRounds > maxRounds) {
    return { ok: false, reason: `Your plan allows up to ${maxRounds} rounds` };
  }

  const allowed = new Set(ents.round_types_allowed ?? []);
  if (allowed.has('*')) return { ok: true };

  const disallowedTypes = (roundTypes ?? []).filter(rt => !allowed.has(rt));
  if (disallowedTypes.length > 0) {
    return {
      ok: false,
      reason: `Round types not allowed: ${disallowedTypes.join(', ')}. Your plan allows: ${Array.from(allowed).join(', ')}`
    };
  }
  return { ok: true };
}

/**
 * Credits functions: keep as-is (v1 compatibility)
 */
export async function consumeCredit(clubId) {
  try {
    const [result] = await connection.execute(`
      UPDATE fundraisely_club_plan 
      SET game_credits_remaining = game_credits_remaining - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE club_id = ? AND game_credits_remaining > 0
    `, [clubId]);

    if (result.affectedRows === 0) return false;
    return true;
  } catch (error) {
    console.error(`[Credits] ❌ Database error consuming credit for club "${clubId}":`, error);
    return false;
  }
}

export async function grantCredits(clubId, amount) {
  try {
    const [result] = await connection.execute(`
      UPDATE fundraisely_club_plan 
      SET game_credits_remaining = game_credits_remaining + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE club_id = ?
    `, [amount, clubId]);

    if (result.affectedRows === 0) return false;
    return true;
  } catch (error) {
    console.error(`[Credits] ❌ Database error granting credits to club "${clubId}":`, error);
    return false;
  }
}

