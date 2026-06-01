// server/campaigns/services/campaignPaymentMethodsService.js
//
// Manages payment methods linked to a campaign.
// Mirrors the pattern of QuizPaymentMethodsService but operates on
// fundraisely_campaigns.linked_payment_methods_json instead of the room table.
//
// Auto-confirmation rules (same as rest of system):
//   stripe  → auto-confirmed via Stripe webhook
//   crypto  → auto-confirmed on-chain
//   everything else → stays 'claimed', club confirms in Orders tab

import { connection, TABLE_PREFIX } from '../../config/database.js';

const T_CAMPAIGNS = `${TABLE_PREFIX}campaigns`;
const T_METHODS   = `${TABLE_PREFIX}club_payment_methods`;

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

// ─── Auth-gated (management) ──────────────────────────────────────────────────

/**
 * Get all enabled club payment methods + which are linked to this campaign.
 * Used by the management UI to show the tick-list.
 */
export async function getCampaignPaymentMethods(campaignId, clubId) {
  // Verify ownership
  const [campRows] = await connection.execute(
    `SELECT id, club_id, linked_payment_methods_json
     FROM ${T_CAMPAIGNS} WHERE id = ? AND club_id = ? LIMIT 1`,
    [campaignId, clubId]
  );
  if (!campRows[0]) throw Object.assign(new Error('campaign_not_found'), { status: 404 });

  const linked = parseJson(campRows[0].linked_payment_methods_json, {});
  const linkedIds = Array.isArray(linked.payment_method_ids)
    ? linked.payment_method_ids.map(Number)
    : [];

  // All enabled club methods
  const [methods] = await connection.execute(
    `SELECT id, method_category, provider_name, method_label,
            display_order, is_enabled, player_instructions,
            method_config, is_official_club_account
     FROM ${T_METHODS}
     WHERE club_id = ? AND is_enabled = 1
     ORDER BY display_order ASC, method_label ASC`,
    [clubId]
  );

  return {
    available_methods: methods.map(formatMethod),
    linked_method_ids: linkedIds,
    total_available:   methods.length,
  };
}

/**
 * Update which payment methods are linked to a campaign.
 * Validates all IDs belong to the club before saving.
 */
export async function updateCampaignPaymentMethods(campaignId, clubId, methodIds, updatedBy = null) {
  // Verify ownership
  const [campRows] = await connection.execute(
    `SELECT id FROM ${T_CAMPAIGNS} WHERE id = ? AND club_id = ? LIMIT 1`,
    [campaignId, clubId]
  );
  if (!campRows[0]) throw Object.assign(new Error('campaign_not_found'), { status: 404 });

  // Validate all IDs belong to this club
  if (methodIds.length > 0) {
    const placeholders = methodIds.map(() => '?').join(',');
    const [valid] = await connection.execute(
      `SELECT id FROM ${T_METHODS} WHERE club_id = ? AND id IN (${placeholders})`,
      [clubId, ...methodIds]
    );
    if (valid.length !== methodIds.length) {
      throw Object.assign(new Error('invalid_payment_method_ids'), { status: 400 });
    }
  }

  const json = JSON.stringify({
    payment_method_ids: methodIds.map(Number),
    updated_at:         new Date().toISOString(),
    updated_by:         updatedBy ?? null,
  });

  await connection.execute(
    `UPDATE ${T_CAMPAIGNS}
     SET linked_payment_methods_json = ?
     WHERE id = ? AND club_id = ?`,
    [json, campaignId, clubId]
  );

  return { payment_method_ids: methodIds, updated_at: new Date().toISOString() };
}

// ─── Public (no auth) ─────────────────────────────────────────────────────────

/**
 * Get enabled payment methods linked to a campaign for the public supporter page.
 * Falls back to empty array if none configured — frontend shows "contact organiser".
 */
export async function getPublicCampaignPaymentMethods(campaignId) {
  const [campRows] = await connection.execute(
    `SELECT club_id, linked_payment_methods_json
     FROM ${T_CAMPAIGNS} WHERE id = ? LIMIT 1`,
    [campaignId]
  );
  if (!campRows[0]) throw Object.assign(new Error('campaign_not_found'), { status: 404 });

  const { club_id: clubId, linked_payment_methods_json } = campRows[0];
  const linked  = parseJson(linked_payment_methods_json, {});
  const linkedIds = Array.isArray(linked.payment_method_ids)
    ? linked.payment_method_ids.map(Number)
    : [];

  if (!linkedIds.length) {
    return { ok: true, paymentMethods: [] };
  }

  const placeholders = linkedIds.map(() => '?').join(',');
  const [methods] = await connection.execute(
    `SELECT id, method_category, provider_name, method_label,
            display_order, is_enabled, player_instructions,
            method_config, is_official_club_account
     FROM ${T_METHODS}
     WHERE club_id = ? AND id IN (${placeholders}) AND is_enabled = 1
     ORDER BY display_order ASC, method_label ASC`,
    [clubId, ...linkedIds]
  );

  return {
    ok: true,
    paymentMethods: methods.map(formatMethod),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMethod(row) {
  return {
    id:                   Number(row.id),
    methodCategory:       row.method_category,
    providerName:         row.provider_name ?? null,
    methodLabel:          row.method_label,
    displayOrder:         row.display_order ?? 0,
    isEnabled:            row.is_enabled === 1 || row.is_enabled === true,
    playerInstructions:   row.player_instructions ?? null,
    methodConfig:         parseJson(row.method_config),
    isOfficialClubAccount: row.is_official_club_account === 1 || row.is_official_club_account === true,
  };
}