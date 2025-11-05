// server/policy/entitlements.js

import { connection } from '../config/database.js';

const _JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';



// Fallback plans (used if DB is unavailable)
const FALLBACK_FREE_PLAN = {
  max_players_per_game: 3,
  max_rounds: 8,
  round_types_allowed: ['general_trivia', 'wipeout', 'speed_round'],
  extras_allowed: ['buyHint', 'restorePoints', 'freezeOutTeam', 'robPoints'],
  concurrent_rooms: 1,
  game_credits_remaining: 2,
};

const _FALLBACK_DEV_PLAN = {
  max_players_per_game: 20,
  max_rounds: 8,
  round_types_allowed: ['general_trivia', 'wipeout', 'speed_round'],
  extras_allowed: ['buyHint', 'restorePoints', 'freezeOutTeam', 'robPoints'],
  concurrent_rooms: 10,
  game_credits_remaining: 9999,
};

/** Tiny helper: only Dev plan (id=2) can use demo-quiz */
export function canUseTemplate(entitlements, templateId) {
  if (templateId === 'demo-quiz') {
    return entitlements?.plan_id === 2 || entitlements?.plan_code === 'DEV';
  }
  return true; // all other templates allowed
}

/**
 * Resolve entitlements for a club from database
 */
export async function resolveEntitlements({ userId: clubId }) {
  // Add null check
  if (!clubId) {
    console.warn('[Entitlements] ⚠️ No clubId provided, using fallback FREE_PLAN');
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
  }

  // Check database connection
  if (!connection) {
    console.error('[Entitlements] ❌ Database connection not available');
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
  }

  // Safe JSON parsing helper
  const parseSafe = (value, fallback) => {
    if (Array.isArray(value)) return value;
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn('[Entitlements] ⚠️ Failed to parse JSON:', e.message);
      return fallback;
    }
  };

  try {
    // Query club with plan information
    const [planRows] = await connection.execute(`
      SELECT 
        c.id as club_id,
        c.name as club_name,
        c.email as club_email,
        p.id   as plan_id,          -- ✅ add this
        p.code as plan_code,        -- ✅ already selected, keep
        p.name as plan_name,
        p.max_players_per_game,
        p.max_rounds,
        p.concurrent_rooms,
        p.round_types_allowed,
        p.extras_allowed,
        cp.game_credits_remaining,
        cp.overrides
      FROM fundraisely_clubs c
      LEFT JOIN fundraisely_club_plan cp ON c.id = cp.club_id
      LEFT JOIN fundraisely_plans     p ON cp.plan_id = p.id
      WHERE c.id = ?
    `, [clubId]);

    if (!Array.isArray(planRows) || planRows.length === 0) {
      console.warn(`[Entitlements] ⚠️ Club "${clubId}" not found in database, using fallback FREE_PLAN`);
      return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
    }

    const clubData = planRows[0];

    if (!clubData.plan_code) {
      console.warn(`[Entitlements] ⚠️ Club "${clubId}" (${clubData.club_name}) has no plan assigned, using fallback FREE_PLAN`);
      return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
    }

    console.log('[Debug] Raw round_types_allowed:', clubData.round_types_allowed);
    console.log('[Debug] Raw extras_allowed:', clubData.extras_allowed);
    console.log('[Debug] Type of round_types_allowed:', typeof clubData.round_types_allowed);

    // Build entitlements from database with safe JSON parsing
    const entitlements = {
      plan_id: clubData.plan_id,          // ✅ expose plan_id
      plan_code: clubData.plan_code,      // ✅ keep plan_code
      max_players_per_game: clubData.max_players_per_game,
      max_rounds: clubData.max_rounds,
      round_types_allowed: parseSafe(clubData.round_types_allowed, []),
      extras_allowed: parseSafe(clubData.extras_allowed, []),
      concurrent_rooms: clubData.concurrent_rooms,
      game_credits_remaining: clubData.game_credits_remaining || 0,
    };

    // Apply any overrides with safe parsing
    if (clubData.overrides) {
      try {
        const overrides = parseSafe(clubData.overrides, {});
        Object.assign(entitlements, overrides);
      } catch (overrideError) {
        console.warn('[Entitlements] ⚠️ Failed to parse overrides:', overrideError.message);
      }
    }

    console.log(`[Entitlements] 👤 Club "${clubId}" (${clubData.club_name}) on "${clubData.plan_code}" plan - ${entitlements.game_credits_remaining} credits remaining`);
    return entitlements;

  } catch (error) {
    console.error(`[Entitlements] ❌ Database error for club "${clubId}":`, error);
    console.error('[Entitlements] ❌ Error stack:', error.stack);
    return { ...FALLBACK_FREE_PLAN, plan_id: null, plan_code: 'FREE_FALLBACK' };
  }
}

/**
 * Check if requested room configuration fits within plan limits
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
  
  // Handle wildcard
  if (allowed.has('*')) {
    return { ok: true };
  }

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
 * Consume 1 credit from database
 */
export async function consumeCredit(clubId) {


  try {
    // Atomic decrement using WHERE clause to ensure we don't go below 0
    const [result] = await connection.execute(`
      UPDATE fundraisely_club_plan 
      SET game_credits_remaining = game_credits_remaining - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE club_id = ? AND game_credits_remaining > 0
    `, [clubId]);

    if (result.affectedRows === 0) {
      console.warn(`[Credits] ❌ Credit consumption failed for club "${clubId}" - no credits remaining or club not found`);
      return false;
    }

    console.log(`[Credits] 💳 Credit consumed for club "${clubId}"`);
    return true;

  } catch (error) {
    console.error(`[Credits] ❌ Database error consuming credit for club "${clubId}":`, error);
    return false;
  }
}

/**
 * Grant credits to a club (useful for admin operations)
 */
export async function grantCredits(clubId, amount) {
  try {
    const [result] = await connection.execute(`
      UPDATE fundraisely_club_plan 
      SET game_credits_remaining = game_credits_remaining + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE club_id = ?
    `, [amount, clubId]);

    if (result.affectedRows === 0) {
      console.warn(`[Credits] ⚠️ Grant credits failed for club "${clubId}" - club not found`);
      return false;
    }

    console.log(`[Credits] 🎁 Granted ${amount} credits to club "${clubId}"`);
    return true;

  } catch (error) {
    console.error(`[Credits] ❌ Database error granting credits to club "${clubId}":`, error);
    return false;
  }
}




