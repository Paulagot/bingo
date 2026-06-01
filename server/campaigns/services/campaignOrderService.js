// server/campaigns/services/campaignOrderService.js
//
// Creates and manages campaign product orders.
// Handles pending → claimed → confirmed lifecycle for all payment methods.
// Card orders are confirmed via Stripe webhook (see webhook handler).
// Cash and instant_payment orders are confirmed by club admin via mgmt API.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const T_ORDERS      = `${TABLE_PREFIX}campaign_product_orders`;
const T_ORDER_ITEMS = `${TABLE_PREFIX}campaign_product_order_items`;
const T_PRODUCTS    = `${TABLE_PREFIX}campaign_products`;
const T_ITEMS       = `${TABLE_PREFIX}campaign_product_items`;
const T_CAMPAIGNS   = `${TABLE_PREFIX}campaigns`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId() { return nanoid(21); }

/**
 * Normalise a payment method category to a value that fits the ENUM.
 * The frontend sends methodCategory from fundraisely_club_payment_methods
 * which uses: instant_payment | crypto | card | stripe | other
 * Our ENUM also includes: cash_to_player | cash | card_tap | pay_admin | bank_transfer
 */
function normalisePaymentCategory(category, providerName) {
  const cat      = String(category  || '').toLowerCase().trim();
  const provider = String(providerName || '').toLowerCase().trim();

  // Direct ENUM matches — pass through unchanged
  const valid = new Set([
    'card', 'stripe', 'instant_payment', 'cash_to_player',
    'cash', 'card_tap', 'pay_admin', 'crypto', 'bank_transfer', 'other',
  ]);
  if (valid.has(cat)) return cat;

  // Provider-based mapping (when category is generic)
  if (provider === 'cash' || provider === 'cash_to_player') return 'cash_to_player';
  if (provider === 'card_tap')                               return 'card_tap';
  if (provider === 'stripe')                                 return 'stripe';
  if (provider === 'crypto' || provider === 'solana')        return 'crypto';

  return 'other';
}

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

function formatOrder(row) {
  return {
    id:                    row.id,
    campaignId:            row.campaign_id,
    clubId:                row.club_id,
    sellerId:              row.seller_id ?? null,
    sellerName:            row.seller_name ?? null,
    supporterName:         row.supporter_name,
    supporterEmail:        row.supporter_email,
    supporterPhone:        row.supporter_phone ?? null,
    paymentMethodCategory: row.payment_method_category,
    paymentProvider:       row.payment_provider ?? null,
    paymentReference:      row.payment_reference ?? null,
    paymentStatus:         row.payment_status,
    subtotalAmount:        Number(row.subtotal_amount),
    totalAmount:           Number(row.total_amount),
    currency:              row.currency,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    source:                row.source,
    metadata:              parseJson(row.metadata_json),
    createdAt:             row.created_at,
    updatedAt:             row.updated_at,
    confirmedAt:           row.confirmed_at ?? null,
  };
}

function formatOrderItem(row) {
  return {
    id:                          row.id,
    orderId:                     row.order_id,
    productId:                   row.product_id,
    productNameSnapshot:         row.product_name_snapshot,
    productDescriptionSnapshot:  row.product_description_snapshot ?? null,
    unitPrice:                   Number(row.unit_price),
    quantity:                    Number(row.quantity),
    lineTotal:                   Number(row.line_total),
  };
}

// ─── Public: create order ────────────────────────────────────────────────────

/**
 * Create a supporter order from selected products.
 * Called from the public campaign support page.
 *
 * @param {object} opts
 * @param {string} opts.campaignId
 * @param {string} opts.clubId            – resolved from campaign, not client
 * @param {string|null} opts.sellerId
 * @param {string} opts.supporterName
 * @param {string} opts.supporterEmail
 * @param {string|null} opts.supporterPhone
 * @param {string} opts.paymentMethodCategory
 * @param {string} opts.source
 * @param {Array<{productId, quantity}>} opts.items
 */
export async function createOrder({
  campaignId, clubId, sellerId = null,
  supporterName, supporterEmail, supporterPhone = null,
  paymentMethodCategory, source = 'campaign_page',
  clubPaymentMethodId = null, paymentProvider = null,
  items = [],
}) {
  if (!Array.isArray(items) || !items.length)
    throw Object.assign(new Error('order_requires_at_least_one_item'), { status: 400 });
  if (!supporterName?.trim() || !supporterEmail?.trim())
    throw Object.assign(new Error('supporter_name_and_email_required'), { status: 400 });

  // ── Resolve products and calculate totals ──
  const productIds = [...new Set(items.map(i => i.productId))];
  const placeholders = productIds.map(() => '?').join(',');

  const [productRows] = await connection.execute(
    `SELECT * FROM ${T_PRODUCTS}
     WHERE id IN (${placeholders}) AND campaign_id = ? AND club_id = ? AND is_active = 1`,
    [...productIds, campaignId, clubId]
  );

  const productMap = {};
  for (const p of productRows) productMap[p.id] = p;

  // Validate all products found and available
  for (const item of items) {
    const p = productMap[item.productId];
    if (!p) throw Object.assign(new Error('product_not_found'), { status: 404 });

    // Max sales check
    if (p.max_sales !== null) {
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) AS cnt FROM ${T_ORDER_ITEMS}
         WHERE product_id = ?`,
        [p.id]
      );
      if ((countRows[0]?.cnt ?? 0) >= p.max_sales)
        throw Object.assign(new Error('product_sold_out'), { status: 400 });
    }

    // Sales window check
    const now = new Date();
    if (p.sales_start_at && new Date(p.sales_start_at) > now)
      throw Object.assign(new Error('product_not_yet_available'), { status: 400 });
    if (p.sales_end_at && new Date(p.sales_end_at) < now)
      throw Object.assign(new Error('product_inactive'), { status: 400 });
  }

  let subtotal = 0;
  const currency = productRows[0]?.currency ?? 'EUR';

  const lineItems = items.map(item => {
    const p = productMap[item.productId];
    const qty = Number(item.quantity) || 1;
    const lineTotal = Number(p.price) * qty;
    subtotal += lineTotal;
    return { productId: p.id, name: p.name, description: p.description, unitPrice: Number(p.price), qty, lineTotal };
  });

  // ── Resolve seller name if provided ──
  let sellerName = null;
  if (sellerId) {
    const [sellerRows] = await connection.execute(
      `SELECT seller_name FROM ${TABLE_PREFIX}campaign_sellers WHERE id = ? AND campaign_id = ? LIMIT 1`,
      [sellerId, campaignId]
    ).catch(() => [[]]); // non-fatal if sellers table doesn't exist yet
    sellerName = sellerRows[0]?.seller_name ?? null;
  }

  // ── Determine initial payment status ──
  // card → pending (Stripe webhook confirms later)
  // instant_payment / cash_to_player → pending (supporter will claim)
  const initialStatus = 'pending';

  const orderId = newId();

  await connection.execute(
    `INSERT INTO ${T_ORDERS}
      (id, campaign_id, club_id, seller_id, seller_name,
       supporter_name, supporter_email, supporter_phone,
       payment_method_category, payment_provider, payment_status,
       subtotal_amount, total_amount, currency, source)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      orderId, campaignId, clubId, sellerId, sellerName,
      supporterName.trim(), supporterEmail.trim().toLowerCase(), supporterPhone ?? null,
      normalisePaymentCategory(paymentMethodCategory, paymentProvider),
      paymentProvider ?? null, initialStatus,
      subtotal, subtotal, currency, source,
    ]
  );

  for (const li of lineItems) {
    await connection.execute(
      `INSERT INTO ${T_ORDER_ITEMS}
        (id, order_id, campaign_id, club_id, product_id,
         product_name_snapshot, product_description_snapshot,
         unit_price, quantity, line_total)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        newId(), orderId, campaignId, clubId, li.productId,
        li.name, li.description ?? null,
        li.unitPrice, li.qty, li.lineTotal,
      ]
    );
  }

  return getOrder(orderId);
}

// ─── Get order ───────────────────────────────────────────────────────────────

export async function getOrder(orderId) {
  const [orderRows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`, [orderId]
  );
  if (!orderRows[0]) throw Object.assign(new Error('order_not_found'), { status: 404 });

  const [itemRows] = await connection.execute(
    `SELECT * FROM ${T_ORDER_ITEMS} WHERE order_id = ?`, [orderId]
  );

  return {
    order: { ...formatOrder(orderRows[0]), items: itemRows.map(formatOrderItem) }
  };
}

// ─── List orders (management) ─────────────────────────────────────────────────

export async function listOrders(campaignId, clubId, filters = {}) {
  const conditions = ['o.campaign_id = ?', 'o.club_id = ?'];
  const params = [campaignId, clubId];

  if (filters.paymentStatus) {
    conditions.push('o.payment_status = ?');
    params.push(filters.paymentStatus);
  }
  if (filters.sellerId) {
    conditions.push('o.seller_id = ?');
    params.push(filters.sellerId);
  }
  if (filters.paymentMethodCategory) {
    conditions.push('o.payment_method_category = ?');
    params.push(filters.paymentMethodCategory);
  }

  const where = conditions.join(' AND ');
  const [rows] = await connection.execute(
    `SELECT o.* FROM ${T_ORDERS} o WHERE ${where} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );

  return { orders: rows.map(formatOrder) };
}

// ─── Claim payment (supporter action) ────────────────────────────────────────

/**
 * Supporter marks they have paid (instant payment or cash-to-player).
 * Transitions order: pending → claimed
 * Creates pending campaign entries so club can see expected volume.
 */
export async function claimPayment(orderId, { paymentReference = null, clubPaymentMethodId = null } = {}) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`, [orderId]
  );
  const order = rows[0];
  if (!order) throw Object.assign(new Error('order_not_found'), { status: 404 });
  if (order.payment_status !== 'pending')
    throw Object.assign(new Error('payment_status_invalid'), { status: 400 });

  await connection.execute(
    `UPDATE ${T_ORDERS} SET payment_status = 'claimed', payment_reference = ? WHERE id = ?`,
    [paymentReference ?? null, orderId]
  );

  return getOrder(orderId);
}

// ─── Attach Stripe intent ────────────────────────────────────────────────────

export async function attachStripeIntent(orderId, stripePaymentIntentId) {
  await connection.execute(
    `UPDATE ${T_ORDERS} SET stripe_payment_intent_id = ? WHERE id = ?`,
    [stripePaymentIntentId, orderId]
  );
}

// ─── Confirm order (club admin OR Stripe webhook) ────────────────────────────

/**
 * Confirm a cash or instant_payment order.
 * Called by club admin via management API.
 * Transitions: claimed → confirmed
 * Triggers entry expansion (imported lazily to avoid circular deps).
 */
export async function confirmOrder(orderId, campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? AND campaign_id = ? AND club_id = ? LIMIT 1`,
    [orderId, campaignId, clubId]
  );
  const order = rows[0];
  if (!order) throw Object.assign(new Error('order_not_found'), { status: 404 });
  if (order.payment_status !== 'claimed')
    throw Object.assign(new Error('order_not_confirmable'), { status: 400 });

  await connection.execute(
    `UPDATE ${T_ORDERS} SET payment_status = 'confirmed', confirmed_at = UTC_TIMESTAMP() WHERE id = ?`,
    [orderId]
  );

  // Expand entries
  const { expandOrderIntoEntries } = await import('./campaignEntryExpansionService.js');
  await expandOrderIntoEntries(orderId);

  return getOrder(orderId);
}

/**
 * Confirm an order from Stripe webhook (no club_id check needed — webhook is internal).
 * Used for card payment confirmations.
 */
export async function confirmOrderByStripeIntent(stripePaymentIntentId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE stripe_payment_intent_id = ? LIMIT 1`,
    [stripePaymentIntentId]
  );
  const order = rows[0];
  if (!order) return null; // Not a campaign order — caller should handle other order types

  if (order.payment_status === 'confirmed') return formatOrder(order); // Idempotent

  await connection.execute(
    `UPDATE ${T_ORDERS} SET payment_status = 'confirmed', confirmed_at = UTC_TIMESTAMP() WHERE id = ?`,
    [order.id]
  );

  const { expandOrderIntoEntries } = await import('./campaignEntryExpansionService.js');
  await expandOrderIntoEntries(order.id);

  // Send order-level confirmation email (non-fatal).
  // Fires from here so it works even if the supporter closes the tab before
  // CampaignStripeSuccess.tsx finishes polling. The webhook always runs.
  try {
    const { sendCampaignOrderConfirmationEmail } = await import('./campaignOrderEmailService.js');
    await sendCampaignOrderConfirmationEmail(order.id);
  } catch (emailErr) {
    console.error('[CampaignOrder] ⚠️ Stripe order confirmation email failed (non-fatal):', emailErr.message);
  }

  return formatOrder({ ...order, payment_status: 'confirmed' });
}

// ─── Reject cash order ────────────────────────────────────────────────────────

export async function rejectOrder(orderId, campaignId, clubId, reason = null) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? AND campaign_id = ? AND club_id = ? LIMIT 1`,
    [orderId, campaignId, clubId]
  );
  const order = rows[0];
  if (!order) throw Object.assign(new Error('order_not_found'), { status: 404 });
  if (!['pending', 'claimed'].includes(order.payment_status))
    throw Object.assign(new Error('order_not_confirmable'), { status: 400 });

  await connection.execute(
    `UPDATE ${T_ORDERS} SET payment_status = 'cancelled', metadata_json = JSON_SET(COALESCE(metadata_json,'{}'), '$.rejectReason', ?) WHERE id = ?`,
    [reason ?? 'rejected_by_club', orderId]
  );

  // Cancel any pending entries
  const T_ENTRIES = `${TABLE_PREFIX}campaign_entries`;
  await connection.execute(
    `UPDATE ${T_ENTRIES} SET status = 'cancelled' WHERE order_id = ? AND status = 'pending_payment'`,
    [orderId]
  );

  return getOrder(orderId);
}