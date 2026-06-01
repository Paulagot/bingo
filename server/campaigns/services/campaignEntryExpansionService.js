// server/campaigns/services/campaignEntryExpansionService.js
//
// Core expansion engine: confirmed order → campaign_entries → tickets/access records.
// Called by campaignOrderService after a payment is confirmed.
//
// Architecture rule from spec:
//   Products define what supporters buy.
//   Product items define what tickets or entries are created.
//   This service does the expansion and delegates to bridge/puzzle services.
//
// FIXES:
//   - Bundle price is now apportioned by RATIO of each room's actual entryFee
//     from config_json, not by equal split. E.g. quiz €10 + elimination €2 in
//     a €36 bundle → quiz gets €30, elimination gets €6.
//     Falls back to equal split if no room fees are configured.
//   - existingTicketId (from crypto) is now ONLY linked to the product_item whose
//     target_room_id matches the ticket's room. All other items in a bundle get
//     freshly created tickets. Previously it was applied to the first entry
//     regardless of which room it was for, causing the elimination ticket to
//     never be created for crypto bundle purchases.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const T_ORDERS      = `${TABLE_PREFIX}campaign_product_orders`;
const T_ORDER_ITEMS = `${TABLE_PREFIX}campaign_product_order_items`;
const T_PROD_ITEMS  = `${TABLE_PREFIX}campaign_product_items`;
const T_ENTRIES     = `${TABLE_PREFIX}campaign_entries`;
const T_TICKETS     = `${TABLE_PREFIX}quiz_tickets`;
const T_ROOMS       = `${TABLE_PREFIX}web2_quiz_rooms`;
const T_CAMPAIGNS   = `${TABLE_PREFIX}campaigns`;
const T_PAY_METHODS = `${TABLE_PREFIX}club_payment_methods`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId() { return nanoid(21); }

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

// ─── Campaign payment method resolution ──────────────────────────────────────

/**
 * Resolve the correct club_payment_method_id for this order.
 *
 * The campaign stores its linked payment methods in
 * fundraisely_campaigns.linked_payment_methods_json.
 * We find the method that matches the order's payment_method_category
 * so the ticket and ledger entries record the right payment method ID —
 * not the room's on-the-night method (which is what the bridge used to
 * look up from the room's linked_payment_methods_json).
 *
 * Falls back to the first linked method if no category match, then null.
 */
async function resolveOrderPaymentMethodId(order) {
  try {
    const [campRows] = await connection.execute(
      `SELECT linked_payment_methods_json FROM ${T_CAMPAIGNS} WHERE id = ? LIMIT 1`,
      [order.campaign_id]
    );

    const linked = parseJson(campRows[0]?.linked_payment_methods_json, {});
    const ids = Array.isArray(linked.payment_method_ids) ? linked.payment_method_ids : [];
    if (!ids.length) return null;

    // Try to match by payment category
    const cat = String(order.payment_method_category || '').toLowerCase();
    const placeholders = ids.map(() => '?').join(',');

    const [methodRows] = await connection.execute(
      `SELECT id, method_category, provider_name
       FROM ${T_PAY_METHODS}
       WHERE id IN (${placeholders}) AND club_id = ? AND is_enabled = 1
       ORDER BY FIELD(id, ${placeholders})`,
      [...ids, order.club_id, ...ids]
    );

    if (!methodRows.length) return Number(ids[0]) || null;

    // Map category to method_category ENUM values in the DB
    const categoryMap = {
      'stripe':          'stripe',
      'crypto':          'crypto',
      'instant_payment': 'instant_payment',
      'bank_transfer':   'instant_payment',
      'cash_to_player':  'instant_payment',
      'cash':            'instant_payment',
    };
    const dbCategory = categoryMap[cat] ?? cat;

    // First: exact category match
    let match = methodRows.find(m =>
      String(m.method_category).toLowerCase() === dbCategory
    );

    // Second: for cash/instant, also try provider name match
    if (!match && (cat === 'cash_to_player' || cat === 'cash')) {
      match = methodRows.find(m =>
        ['cash', 'cash_to_player', 'cash_at_door'].includes(
          String(m.provider_name).toLowerCase()
        )
      );
    }

    // Fallback: first linked method
    const resolved = match ?? methodRows[0];
    return Number(resolved.id) || null;

  } catch (err) {
    console.warn('[EntryExpansion] ⚠️ Could not resolve payment method ID:', err.message);
    return null;
  }
}

// ─── Price apportionment ─────────────────────────────────────────────────────

/**
 * Given a list of product_items (each with a target_room_id) and the bundle's
 * unit_price, return a Map<productItemId, apportionedFee> where each fee is
 * proportional to that room's entryFee from config_json.
 *
 * Strategy:
 *   1. Fetch config_json.entryFee for every room in the bundle in one query.
 *   2. Sum the room fees to get a "reference total".
 *   3. Each item's apportioned fee = bundlePrice × (roomFee / referenceTotal).
 *   4. To avoid rounding drift the last item gets the remainder.
 *
 * Fallback: if ALL room fees are 0 / missing, split the bundle price equally.
 */
async function apportionBundlePrice(productItems, bundlePrice) {
  const feeMap = new Map(); // productItemId → apportionedFee

  if (productItems.length === 1) {
    // Single item — no apportionment needed
    feeMap.set(productItems[0].id, Number(bundlePrice));
    return feeMap;
  }

  // Fetch entryFee from config_json for every room in one query
  const roomIds = [...new Set(productItems.map(pi => pi.target_room_id).filter(Boolean))];
  const placeholders = roomIds.map(() => '?').join(',');

  const [roomRows] = await connection.execute(
    `SELECT room_id, config_json FROM ${T_ROOMS} WHERE room_id IN (${placeholders})`,
    roomIds
  );

  const roomFeeByRoomId = {};
  for (const row of roomRows) {
    const cfg = parseJson(row.config_json, {});
    // entryFee can be stored as number or string — coerce to number
    const fee = Number(cfg?.entryFee ?? 0);
    roomFeeByRoomId[row.room_id] = Number.isFinite(fee) && fee > 0 ? fee : 0;
  }

  // Build per-item fees in the same order as productItems
  const roomFees = productItems.map(pi => roomFeeByRoomId[pi.target_room_id] ?? 0);
  const referenceTotal = roomFees.reduce((s, f) => s + f, 0);

  const price = Number(bundlePrice);

  if (referenceTotal === 0) {
    // Fallback: equal split — no room fees configured
    const equalShare = Number((price / productItems.length).toFixed(2));
    const remainder  = Number((price - equalShare * (productItems.length - 1)).toFixed(2));
    productItems.forEach((pi, idx) => {
      feeMap.set(pi.id, idx === productItems.length - 1 ? remainder : equalShare);
    });
    console.log(`[EntryExpansion] ⚠️ No room entry fees found — falling back to equal split (${equalShare} each)`);
    return feeMap;
  }

  // Ratio-based apportionment — last item gets remainder to avoid rounding drift
  let allocated = 0;
  productItems.forEach((pi, idx) => {
    if (idx === productItems.length - 1) {
      // Last item gets whatever is left to ensure total = bundlePrice exactly
      feeMap.set(pi.id, Number((price - allocated).toFixed(2)));
    } else {
      const share = Number(((roomFees[idx] / referenceTotal) * price).toFixed(2));
      feeMap.set(pi.id, share);
      allocated += share;
    }
  });

  // Log for visibility during testing
  const breakdown = productItems.map(pi =>
    `room ${pi.target_room_id}: roomFee=${roomFeeByRoomId[pi.target_room_id] ?? 0} → apportioned=${feeMap.get(pi.id)}`
  ).join(' | ');
  console.log(`[EntryExpansion] 💰 Apportionment (bundle €${price}, refTotal=${referenceTotal}): ${breakdown}`);

  return feeMap;
}

// ─── Main expansion function ──────────────────────────────────────────────────

/**
 * Expand a confirmed (or claimed, for cash preview) order into campaign_entries.
 * For each order_item × product_item × quantity, one campaign_entry is created.
 * Downstream entitlements (tickets, puzzle access) are created via bridge services.
 *
 * Idempotent: existing 'confirmed' entries for the same order are not duplicated.
 *
 * @param {string} orderId
 * @param {object} opts
 * @param {string|null} opts.existingTicketId   — ticket already created by CryptoFixedFeeStep
 * @param {string|null} opts.existingJoinToken  — join token for that ticket
 * @param {string|null} opts.existingTicketRoomId — the room the existing ticket belongs to.
 *   IMPORTANT: if not supplied we look it up from the DB so we can correctly
 *   match it to only the product_item for that room, not every item in the bundle.
 */
export async function expandOrderIntoEntries(orderId, opts = {}) {
  const { existingTicketId = null, existingJoinToken = null } = opts;

  const [orderRows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`, [orderId]
  );
  const order = orderRows[0];
  if (!order) throw new Error(`order_not_found: ${orderId}`);

  // Idempotency: skip if already fully expanded
  const [existingRows] = await connection.execute(
    `SELECT COUNT(*) AS cnt FROM ${T_ENTRIES}
     WHERE order_id = ? AND status NOT IN ('cancelled','refunded')`,
    [orderId]
  );
  if ((existingRows[0]?.cnt ?? 0) > 0) {
    console.log(`[EntryExpansion] ℹ️ Order ${orderId} already expanded, skipping.`);
    return;
  }

  // ── FIX: if an existingTicketId was supplied (crypto), resolve which room it
  //         belongs to so we only link it to the matching product_item, not every
  //         item in the bundle.
  let existingTicketRoomId = opts.existingTicketRoomId ?? null;
  if (existingTicketId && !existingTicketRoomId) {
    const [ticketRows] = await connection.execute(
      `SELECT room_id FROM ${T_TICKETS} WHERE ticket_id = ? LIMIT 1`,
      [existingTicketId]
    );
    existingTicketRoomId = ticketRows[0]?.room_id ?? null;
    if (existingTicketRoomId) {
      console.log(`[EntryExpansion] 🔍 Resolved existing ticket ${existingTicketId} → room ${existingTicketRoomId}`);
    }
  }

  const [orderItems] = await connection.execute(
    `SELECT * FROM ${T_ORDER_ITEMS} WHERE order_id = ?`, [orderId]
  );

  const entryStatus = order.payment_status === 'confirmed' ? 'confirmed' : 'pending_payment';

  for (const orderItem of orderItems) {
    const [productItems] = await connection.execute(
      `SELECT * FROM ${T_PROD_ITEMS} WHERE product_id = ?`, [orderItem.product_id]
    );

    // ── Ratio-based price apportionment ───────────────────────────────────────
    // Pre-compute each product item's share of the bundle price using the
    // room's actual entryFee from config_json as the weighting factor.
    // E.g. quiz €10 + elimination €2 in a €36 bundle → quiz €30, elim €6.
    // Falls back to equal split if no room fees are found.
    const unitPrice = Number(orderItem.unit_price ?? 0);
    const feeByItemId = await apportionBundlePrice(productItems, unitPrice);

    // Resolve the campaign's actual payment method ID once per order item.
    const clubPaymentMethodId = await resolveOrderPaymentMethodId(order);

    for (const productItem of productItems) {
      const totalQty = productItem.quantity * (orderItem.quantity || 1);
      // The apportioned fee for THIS product item (room-ratio weighted)
      const apportionedFee = feeByItemId.get(productItem.id) ?? unitPrice;

      for (let i = 0; i < totalQty; i++) {
        const entryId = newId();

        await connection.execute(
          `INSERT INTO ${T_ENTRIES}
            (id, campaign_id, club_id, room_id, order_id, order_item_id,
             product_id, product_item_id, seller_id,
             supporter_name, supporter_email, entry_type, status,
             confirmed_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            entryId,
            order.campaign_id,
            order.club_id,
            productItem.target_room_id,
            orderId,
            orderItem.id,
            orderItem.product_id,
            productItem.id,
            order.seller_id ?? null,
            order.supporter_name,
            order.supporter_email,
            productItem.item_type,
            entryStatus,
            entryStatus === 'confirmed' ? new Date() : null,
          ]
        );

        if (entryStatus === 'confirmed') {
          // For crypto bundles, only link the existing ticket to the product_item
          // whose room matches the existing ticket's room. All other items get
          // freshly created tickets with their correctly apportioned fee.
          const roomMatches = existingTicketRoomId &&
            productItem.target_room_id === existingTicketRoomId;
          const useExistingTicket = i === 0 && existingTicketId && roomMatches;

          await createDownstreamEntitlement(entryId, productItem.item_type, {
            order,
            productItem,
            orderItem,
            apportionedFee,        // ← ratio-weighted fee for this specific room
            clubPaymentMethodId,   // ← actual campaign payment method ID
            existingTicketId:  useExistingTicket ? existingTicketId  : null,
            existingJoinToken: useExistingTicket ? existingJoinToken : null,
          });
        }
      }
    }
  }

  console.log(`[EntryExpansion] ✅ Order ${orderId} expanded to ${T_ENTRIES}`);
}

/**
 * Confirm previously pending entries when a cash/instant order is confirmed.
 * Called after the club approves a cash order that was already partially expanded.
 */
export async function confirmPendingEntries(orderId) {
  const [orderRows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`, [orderId]
  );
  const order = orderRows[0];
  if (!order) return;

  const [rows] = await connection.execute(
    `SELECT * FROM ${T_ENTRIES} WHERE order_id = ? AND status = 'pending_payment'`,
    [orderId]
  );

  // Group pending entries by product_id so we can compute apportionment once
  // per product rather than once per entry (avoids redundant DB lookups).
  const entriesByProduct = {};
  for (const entry of rows) {
    const key = entry.product_id;
    if (!entriesByProduct[key]) entriesByProduct[key] = [];
    entriesByProduct[key].push(entry);
  }

  for (const [productId, productEntries] of Object.entries(entriesByProduct)) {
    // Fetch the product items to know which rooms + quantities are in this product
    const [productItems] = await connection.execute(
      `SELECT * FROM ${T_PROD_ITEMS} WHERE product_id = ?`, [productId]
    );

    // Fetch the order item for price — use first entry's order_item_id (same for all)
    const [orderItemRows] = await connection.execute(
      `SELECT * FROM ${T_ORDER_ITEMS} WHERE id = ? LIMIT 1`,
      [productEntries[0].order_item_id]
    );
    const orderItem = orderItemRows[0] ?? {};
    const unitPrice  = Number(orderItem.unit_price ?? 0);

    // Compute ratio-based apportionment using room entryFee weights
    const feeByItemId = await apportionBundlePrice(productItems, unitPrice);

    // Build a lookup: product_item_id → apportionedFee
    // (entries store product_item_id so we can match them up)
    const feeByProductItemId = {};
    for (const pi of productItems) {
      feeByProductItemId[pi.id] = feeByItemId.get(pi.id) ?? unitPrice;
    }

    for (const entry of productEntries) {
      await connection.execute(
        `UPDATE ${T_ENTRIES} SET status = 'confirmed', confirmed_at = UTC_TIMESTAMP() WHERE id = ?`,
        [entry.id]
      );

      const apportionedFee = feeByProductItemId[entry.product_item_id] ?? unitPrice;
      const pendingClubPaymentMethodId = await resolveOrderPaymentMethodId(order);

      await createDownstreamEntitlement(entry.id, entry.entry_type, {
        order,
        productItem: { target_room_id: entry.room_id, id: entry.product_item_id },
        orderItem,
        apportionedFee,
        clubPaymentMethodId: pendingClubPaymentMethodId,
      });
    }
  }
}

// ─── Downstream entitlement router ───────────────────────────────────────────

async function createDownstreamEntitlement(entryId, itemType, context) {
  try {
    switch (itemType) {
      case 'elimination_entry':
      case 'quiz_team_ticket':
      case 'quiz_individual_ticket':
      case 'game_entry': {
        // If an existing ticket was already created (e.g. by CryptoFixedFeeStep)
        // AND it belongs to this product item's room, just link it.
        // Otherwise create a new ticket (handles all other items in the bundle).
        if (context.existingTicketId) {
          const joinToken = context.existingJoinToken ?? context.existingTicketId;
          const gameType  = itemType === 'elimination_entry' ? 'elimination' : 'quiz';
          const joinUrl   = `/join/${gameType}/${context.productItem.target_room_id}?token=${joinToken}`;
          await connection.execute(
            `UPDATE ${T_ENTRIES}
             SET linked_ticket_id = ?,
                 ticket_code      = ?,
                 join_url         = ?,
                 entry_code       = ?
             WHERE id = ?`,
            [
              context.existingTicketId,
              joinToken,
              joinUrl,
              `FL-${context.existingTicketId.toUpperCase()}`,
              entryId,
            ]
          );
          console.log(`[EntryExpansion] 🔗 Linked existing ticket ${context.existingTicketId} to entry ${entryId}`);
          break;
        }
        const { createTicketForEntry } = await import('./campaignTicketBridgeService.js');
        // Pass totalProductItems so the bridge can apportion the price correctly
        await createTicketForEntry(entryId, itemType, context);
        break;
      }

      case 'puzzle_entry': {
        const { createPuzzleAccessForEntry } = await import('./campaignPuzzleAccessService.js');
        await createPuzzleAccessForEntry(entryId, context);
        break;
      }

      case 'event_ticket':
      case 'custom':
        await assignEntryCode(entryId);
        break;

      default:
        console.warn(`[EntryExpansion] ⚠️ Unknown item_type ${itemType} for entry ${entryId}`);
    }
  } catch (err) {
    console.error(`[EntryExpansion] ❌ Downstream entitlement failed for entry ${entryId}:`, err.message);
    await connection.execute(
      `UPDATE ${T_ENTRIES} SET metadata_json = JSON_SET(COALESCE(metadata_json,'{}'), '$.expansionError', ?) WHERE id = ?`,
      [err.message, entryId]
    );
  }
}

async function assignEntryCode(entryId) {
  const code = `FL-${nanoid(8).toUpperCase()}`;
  await connection.execute(
    `UPDATE ${T_ENTRIES} SET entry_code = ? WHERE id = ?`, [code, entryId]
  );
}