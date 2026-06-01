// server/campaigns/services/campaignProductReportingService.js
//
// Reporting queries for the campaign product builder.
// All queries validate club ownership via campaign ownership.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const T_ORDERS      = `${TABLE_PREFIX}campaign_product_orders`;
const T_ORDER_ITEMS = `${TABLE_PREFIX}campaign_product_order_items`;
const T_ENTRIES     = `${TABLE_PREFIX}campaign_entries`;
const T_PRODUCTS    = `${TABLE_PREFIX}campaign_products`;

/**
 * Campaign-level totals:
 * confirmed raised, claimed cash, pending, progress %.
 */
export async function getCampaignTotals(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT
       payment_status,
       payment_method_category,
       SUM(total_amount) AS total
     FROM ${T_ORDERS}
     WHERE campaign_id = ? AND club_id = ?
     GROUP BY payment_status, payment_method_category`,
    [campaignId, clubId]
  );

  const totals = { confirmed: 0, claimed: 0, pending: 0, cancelled: 0 };
  for (const row of rows) {
    const status = row.payment_status;
    if (totals[status] !== undefined) totals[status] += Number(row.total);
  }

  return totals;
}

/**
 * Sales breakdown by product.
 */
export async function getByProduct(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT
       oi.product_id,
       oi.product_name_snapshot AS product_name,
       SUM(oi.quantity)         AS qty_sold,
       SUM(CASE WHEN o.payment_status = 'confirmed' THEN oi.line_total ELSE 0 END) AS confirmed_value,
       SUM(CASE WHEN o.payment_status = 'claimed'   THEN oi.line_total ELSE 0 END) AS claimed_value,
       SUM(CASE WHEN o.payment_status IN ('cancelled','refunded') THEN 1 ELSE 0 END) AS cancelled_count
     FROM ${T_ORDER_ITEMS} oi
     JOIN ${T_ORDERS} o ON o.id = oi.order_id
     WHERE oi.campaign_id = ? AND oi.club_id = ?
     GROUP BY oi.product_id, oi.product_name_snapshot
     ORDER BY confirmed_value DESC`,
    [campaignId, clubId]
  );
  return rows;
}

/**
 * Sales breakdown by seller.
 */
export async function getBySeller(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT
       o.seller_id,
       o.seller_name,
       COUNT(DISTINCT o.id)                                                          AS order_count,
       SUM(CASE WHEN o.payment_status = 'confirmed' THEN o.total_amount ELSE 0 END) AS confirmed_total,
       SUM(CASE WHEN o.payment_status = 'claimed'
                AND o.payment_method_category = 'cash_to_player'
                THEN o.total_amount ELSE 0 END)                                      AS claimed_cash,
       SUM(CASE WHEN o.payment_method_category IN ('card','instant_payment')
                AND o.payment_status = 'confirmed'
                THEN o.total_amount ELSE 0 END)                                      AS online_total
     FROM ${T_ORDERS} o
     WHERE o.campaign_id = ? AND o.club_id = ?
     GROUP BY o.seller_id, o.seller_name
     ORDER BY confirmed_total DESC`,
    [campaignId, clubId]
  );
  return rows;
}

/**
 * Entries by room/event.
 */
export async function getByRoom(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT
       room_id,
       entry_type,
       COUNT(*) AS total_entries,
       SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END)       AS confirmed_entries,
       SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS pending_entries,
       SUM(CASE WHEN status IN ('used','completed') THEN 1 ELSE 0 END) AS used_entries
     FROM ${T_ENTRIES}
     WHERE campaign_id = ? AND club_id = ?
     GROUP BY room_id, entry_type
     ORDER BY room_id`,
    [campaignId, clubId]
  );
  return rows;
}

/**
 * Payment reconciliation summary.
 */
export async function getPaymentReconciliation(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT
       payment_method_category,
       payment_status,
       COUNT(*) AS order_count,
       SUM(total_amount) AS total
     FROM ${T_ORDERS}
     WHERE campaign_id = ? AND club_id = ?
     GROUP BY payment_method_category, payment_status`,
    [campaignId, clubId]
  );
  return rows;
}

/**
 * Full reporting payload for the management dashboard.
 */
export async function getFullReport(campaignId, clubId) {
  const [totals, byProduct, bySeller, byRoom, reconciliation] = await Promise.all([
    getCampaignTotals(campaignId, clubId),
    getByProduct(campaignId, clubId),
    getBySeller(campaignId, clubId),
    getByRoom(campaignId, clubId),
    getPaymentReconciliation(campaignId, clubId),
  ]);

  return { totals, byProduct, bySeller, byRoom, reconciliation };
}