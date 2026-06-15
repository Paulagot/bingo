// server/campaigns/services/campaignSellerService.js
//
// CRUD for campaign sellers plus public stats endpoint.
// Sellers have no accounts — their nanoid is the access key.
// club_id always from auth, never from client.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const T_SELLERS  = `${TABLE_PREFIX}campaign_sellers`;
const T_ORDERS   = `${TABLE_PREFIX}campaign_product_orders`;
const T_CAMPAIGNS = `${TABLE_PREFIX}campaigns`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId() { return nanoid(21); }

/**
 * Convert a name to a URL-safe slug.
 * "Ava Murphy" → "ava-murphy"
 * Collision: "ava-murphy-2", "ava-murphy-3" etc.
 */
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

async function uniqueSlug(campaignId, base) {
  const [rows] = await connection.execute(
    `SELECT seller_slug FROM ${T_SELLERS}
     WHERE campaign_id = ? AND seller_slug LIKE ?`,
    [campaignId, `${base}%`]
  );
  const existing = new Set(rows.map(r => r.seller_slug));
  if (!existing.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function assertCampaignOwnership(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT id FROM ${T_CAMPAIGNS} WHERE id = ? AND club_id = ? LIMIT 1`,
    [campaignId, clubId]
  );
  if (!rows[0]) throw Object.assign(new Error('campaign_not_found'), { status: 404 });
}

function formatSeller(row) {
  return {
    id:         row.id,
    campaignId: row.campaign_id,
    clubId:     row.club_id,
    sellerName: row.seller_name,
    sellerSlug: row.seller_slug,
    isActive:   row.is_active === 1 || row.is_active === true,
    notes:      row.notes ?? null,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

// ─── Management CRUD ──────────────────────────────────────────────────────────

export async function listSellers(campaignId, clubId) {
  await assertCampaignOwnership(campaignId, clubId);

  const [sellers] = await connection.execute(
    `SELECT s.*,
       COUNT(DISTINCT o.id)                                                         AS order_count,
       COALESCE(SUM(CASE WHEN o.payment_status = 'confirmed' THEN o.total_amount END), 0) AS confirmed_total,
       COALESCE(SUM(CASE WHEN o.payment_status = 'claimed'   THEN o.total_amount END), 0) AS claimed_total,
       MAX(o.created_at)                                                             AS last_sale_at
     FROM ${T_SELLERS} s
     LEFT JOIN ${T_ORDERS} o ON o.seller_id = s.id AND o.campaign_id = s.campaign_id
       AND o.payment_status NOT IN ('cancelled','refunded')
     WHERE s.campaign_id = ? AND s.club_id = ?
     GROUP BY s.id
     ORDER BY confirmed_total DESC, s.seller_name ASC`,
    [campaignId, clubId]
  );

  return {
    sellers: sellers.map(row => ({
      ...formatSeller(row),
      stats: {
        orderCount:     Number(row.order_count    ?? 0),
        confirmedTotal: Number(row.confirmed_total ?? 0),
        claimedTotal:   Number(row.claimed_total   ?? 0),
        lastSaleAt:     row.last_sale_at ?? null,
      },
    }))
  };
}

export async function createSeller(campaignId, clubId, { sellerName, notes = null }) {
  await assertCampaignOwnership(campaignId, clubId);

  if (!sellerName?.trim()) {
    throw Object.assign(new Error('seller_name_required'), { status: 400 });
  }

  const base = toSlug(sellerName.trim());
  const slug = await uniqueSlug(campaignId, base);
  const id   = newId();

  await connection.execute(
    `INSERT INTO ${T_SELLERS} (id, campaign_id, club_id, seller_name, seller_slug, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, campaignId, clubId, sellerName.trim(), slug, notes ?? null]
  );

  const [rows] = await connection.execute(
    `SELECT * FROM ${T_SELLERS} WHERE id = ? LIMIT 1`, [id]
  );
  return { seller: formatSeller(rows[0]) };
}

export async function updateSeller(sellerId, campaignId, clubId, { sellerName, notes, isActive }) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_SELLERS} WHERE id = ? AND campaign_id = ? AND club_id = ? LIMIT 1`,
    [sellerId, campaignId, clubId]
  );
  if (!rows[0]) throw Object.assign(new Error('seller_not_found'), { status: 404 });

  const fields = [];
  const values = [];

  if (sellerName !== undefined) {
    if (!sellerName.trim()) throw Object.assign(new Error('seller_name_required'), { status: 400 });
    fields.push('seller_name = ?');
    values.push(sellerName.trim());
  }
  if (notes !== undefined)     { fields.push('notes = ?');     values.push(notes ?? null); }
  if (isActive !== undefined)  { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  if (fields.length) {
    await connection.execute(
      `UPDATE ${T_SELLERS} SET ${fields.join(', ')} WHERE id = ?`,
      [...values, sellerId]
    );
  }

  const [updated] = await connection.execute(
    `SELECT * FROM ${T_SELLERS} WHERE id = ? LIMIT 1`, [sellerId]
  );
  return { seller: formatSeller(updated[0]) };
}

export async function deleteSeller(sellerId, campaignId, clubId) {
  // Check for orders — if any exist, soft-delete only
  const [orderRows] = await connection.execute(
    `SELECT COUNT(*) AS cnt FROM ${T_ORDERS}
     WHERE seller_id = ? AND payment_status NOT IN ('cancelled','refunded')`,
    [sellerId]
  );
  const hasOrders = (orderRows[0]?.cnt ?? 0) > 0;

  if (hasOrders) {
    // Soft delete
    await connection.execute(
      `UPDATE ${T_SELLERS} SET is_active = 0 WHERE id = ? AND campaign_id = ? AND club_id = ?`,
      [sellerId, campaignId, clubId]
    );
    return { deleted: false, deactivated: true };
  }

  await connection.execute(
    `DELETE FROM ${T_SELLERS} WHERE id = ? AND campaign_id = ? AND club_id = ?`,
    [sellerId, campaignId, clubId]
  );
  return { deleted: true, deactivated: false };
}

// ─── Public (no auth) ─────────────────────────────────────────────────────────

/**
 * Public seller stats page — no auth, seller ID is the key.
 * Returns only aggregate totals, no supporter personal data.
 */
export async function getPublicSellerStats(campaignId, sellerId) {
  const [sellerRows] = await connection.execute(
    `SELECT s.*, c.name AS campaign_name, c.target_amount, c.total_raised
     FROM ${T_SELLERS} s
     JOIN ${T_CAMPAIGNS} c ON c.id = s.campaign_id
     WHERE s.id = ? AND s.campaign_id = ? LIMIT 1`,
    [sellerId, campaignId]
  );
  const seller = sellerRows[0];
  if (!seller || !seller.is_active) {
    throw Object.assign(new Error('seller_not_found'), { status: 404 });
  }

  const [statsRows] = await connection.execute(
    `SELECT
       COUNT(DISTINCT id)                                                            AS order_count,
       COALESCE(SUM(CASE WHEN payment_status = 'confirmed' THEN total_amount END), 0) AS confirmed_total,
       COALESCE(SUM(CASE WHEN payment_status = 'claimed'   THEN total_amount END), 0) AS claimed_total,
       currency
     FROM ${T_ORDERS}
     WHERE seller_id = ? AND campaign_id = ?
       AND payment_status NOT IN ('cancelled','refunded')
     GROUP BY currency
     LIMIT 1`,
    [sellerId, campaignId]
  );

  const stats = statsRows[0] ?? { order_count: 0, confirmed_total: 0, claimed_total: 0, currency: 'EUR' };

  return {
    seller: {
      id:           seller.id,
      sellerName:   seller.seller_name,
      sellerSlug:   seller.seller_slug,
      campaignName: seller.campaign_name,
    },
    stats: {
      orderCount:     Number(stats.order_count    ?? 0),
      confirmedTotal: Number(stats.confirmed_total ?? 0),
      claimedTotal:   Number(stats.claimed_total   ?? 0),
      currency:       stats.currency ?? 'EUR',
    },
  };
}