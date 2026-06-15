// server/campaigns/services/campaignTicketBridgeService.js
//
// Bridges campaign entries to the existing quiz ticket system.
// Creates rows in FL_quiz_tickets compatible with the existing redeem/socket join flow.
//
// Fixes applied:
//   - entry_fee is pre-computed apportionedFee (ratio-weighted by room entryFee)
//   - extras: all enabled room extras are granted at price 0 (same as donation room)
//   - ledger: creates a confirmed ledger entry using ticket_${ticketId} as placeholder
//     player_id — exactly matching the normal ticket flow. Gets upgraded to real
//     player_id when the supporter redeems the ticket and joins the room.
//   - club_payment_method_id resolved from the room's linked payment methods
//   - confirmation email sent via existing sendTicketConfirmationEmail utility

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';

const T_ENTRIES = `${TABLE_PREFIX}campaign_entries`;
const T_TICKETS = `${TABLE_PREFIX}quiz_tickets`;
const T_ROOMS   = `${TABLE_PREFIX}web2_quiz_rooms`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId()    { return nanoid(12); }
function newToken() { return nanoid(16); }

function itemTypeToGameType(itemType) {
  switch (itemType) {
    case 'elimination_entry': return 'elimination';
    case 'quiz_team_ticket':
    case 'quiz_individual_ticket':
    case 'game_entry':
    default:                  return 'quiz';
  }
}

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

/**
 * Fetch room config_json.
 * Used for extras (fundraisingOptions) and email (eventDateTime etc.).
 * Payment method ID now comes from the campaign order context, not the room.
 */
async function getRoomData(roomId, clubId) {
  const [rows] = await connection.execute(
    `SELECT config_json
     FROM ${T_ROOMS}
     WHERE room_id = ? AND club_id = ? LIMIT 1`,
    [roomId, clubId]
  );
  const row = rows[0];
  if (!row) return { config: {} };

  const config = parseJson(row.config_json, {});
  return { config };
}

/**
 * Build the extras array to store on the ticket.
 *
 * Campaign product ticket holders get ALL enabled room extras included at
 * price 0 — they are granted as part of the campaign purchase price.
 * This mirrors how donation rooms give extras automatically.
 *
 * Only quiz rooms have fundraisingOptions — elimination rooms return []
 * which is correct (elimination has no mid-game extras).
 *
 * @param {object} roomConfig  — parsed config_json from the room
 * @returns {Array}  e.g. [{ extraId: 'buyHint', price: 0, source: 'campaign_product', included: true }, ...]
 */
function buildIncludedExtras(roomConfig) {
  const options = roomConfig?.fundraisingOptions ?? {};

  return Object.entries(options)
    .filter(([, enabled]) => enabled === true)
    .map(([extraId]) => ({
      extraId,
      price:    0,
      source:   'campaign_product',
      included: true,
    }));
}

/**
 * Resolve the entry fee for this ticket.
 * context.apportionedFee is pre-computed by campaignEntryExpansionService
 * using ratio-based weighting from each room's config_json.entryFee.
 * Falls back to context.orderItem.unit_price for single-item products.
 */
function resolveEntryFee(context) {
  if (context.apportionedFee != null) return Number(context.apportionedFee);
  return Number(context.orderItem?.unit_price ?? 0);
}

/**
 * Map campaign payment_method_category to the ledger payment_method ENUM.
 * Ledger ENUM: cash | card_tap | instant_payment | pay_admin | stripe | card | crypto | other
 */
function toLedgerPaymentMethod(paymentMethodCategory) {
  const cat = String(paymentMethodCategory || '').toLowerCase();
  switch (cat) {
    case 'stripe':           return 'stripe';
    case 'crypto':           return 'crypto';
    case 'instant_payment':  return 'instant_payment';
    case 'bank_transfer':    return 'instant_payment';
    case 'cash_to_player':   return 'cash';
    case 'cash':             return 'cash';
    case 'card':             return 'card';
    case 'card_tap':         return 'card_tap';
    default:                 return 'other';
  }
}

/**
 * Map campaign payment_method_category to the ledger payment_source ENUM.
 * Ledger ENUM: player_selected | player_claimed | admin_assigned | webhook_auto | onchain_auto
 *
 * At campaign ticket creation time payment is already confirmed, so:
 *   - stripe  → webhook_auto   (confirmed by Stripe webhook)
 *   - crypto  → onchain_auto   (confirmed on-chain)
 *   - all others → admin_assigned (club manually confirmed cash/instant)
 */
function toLedgerPaymentSource(paymentMethodCategory) {
  const cat = String(paymentMethodCategory || '').toLowerCase();
  if (cat === 'stripe')  return 'webhook_auto';
  if (cat === 'crypto')  return 'onchain_auto';
  return 'admin_assigned';
}

// ─── Main bridge function ─────────────────────────────────────────────────────

/**
 * Create a quiz_ticket record for a confirmed campaign entry.
 * Also creates the corresponding ledger entry and grants all room extras.
 *
 * @param {string} entryId
 * @param {string} itemType
 * @param {object} context — { order, productItem, orderItem, apportionedFee }
 */
export async function createTicketForEntry(entryId, itemType, context) {
  const { order, productItem, orderItem } = context;

  const ticketId  = newId();
  const joinToken = newToken();
  const gameType  = itemTypeToGameType(itemType);
  const roomId    = productItem.target_room_id;
  const clubId    = order.club_id ?? order.clubId;
  const currency  = order.currency ?? 'EUR';
  const orderId   = order.id;

  // ── 1. Fetch room config (for extras and email) ──────────────────────────
  // clubPaymentMethodId comes from the campaign order via context — it's the
  // method the supporter actually used, not the room's on-the-night method.
  const { config: roomConfig } = await getRoomData(roomId, clubId);
  const clubPaymentMethodId = context.clubPaymentMethodId ?? null;

  // ── 2. Extras: grant all enabled room extras at price 0 ───────────────────
  const extras     = buildIncludedExtras(roomConfig);
  const extrasJson = JSON.stringify(extras);
  // extras_total stays 0 — they are included in the campaign price
  // total_amount = entryFee only (no extra charge)

  // ── 3. Entry fee ──────────────────────────────────────────────────────────
  const entryFee = resolveEntryFee(context);

  // ── 4. Insert ticket ──────────────────────────────────────────────────────
  await connection.execute(
    `INSERT INTO ${T_TICKETS}
      (ticket_id, room_id, club_id,
       purchaser_name, purchaser_email, purchaser_phone, player_name,
       entry_fee, extras, extras_total, total_amount, currency,
       payment_status, payment_method, payment_reference, club_payment_method_id,
       redemption_status, join_token,
       confirmed_at, confirmed_by, confirmed_by_name, confirmed_by_role,
       created_at, updated_at)
     VALUES
      (?, ?, ?,
       ?, ?, NULL, ?,
       ?, ?, 0, ?, ?,
       'payment_confirmed', 'campaign_product', ?, ?,
       'ready', ?,
       UTC_TIMESTAMP(), 'system', 'Campaign Product', 'system',
       UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      ticketId,
      roomId,
      clubId,
      order.supporter_name,
      order.supporter_email,
      order.supporter_name,          // player_name = purchaser_name for now
      entryFee,
      extrasJson,                    // ← all enabled room extras at price 0
      entryFee,                      // total_amount = entryFee (extras are free)
      currency,
      `campaign_entry_${entryId}`,   // payment_reference — traceable to entry
      clubPaymentMethodId,
      joinToken,
    ]
  );

  // ── 5. Update campaign entry ──────────────────────────────────────────────
  const joinUrl = `/join/${gameType}/${roomId}?token=${joinToken}`;

  await connection.execute(
    `UPDATE ${T_ENTRIES}
     SET linked_ticket_id = ?,
         ticket_code      = ?,
         join_url         = ?,
         entry_code       = ?
     WHERE id = ?`,
    [ticketId, joinToken, joinUrl, `FL-${ticketId.toUpperCase()}`, entryId]
  );

  console.log(
    `[TicketBridge] ✅ Ticket ${ticketId} created for entry ${entryId}` +
    ` (${gameType}) fee=${currency}${entryFee} extras=[${extras.map(e => e.extraId).join(',')}]`
  );

  // ── 6. Ledger entry ───────────────────────────────────────────────────────
  // Use ticket_${ticketId} as placeholder player_id — exactly matching the
  // normal ticket purchase flow in quizTicketService.js. This gets upgraded
  // to the real player_id when the supporter redeems the ticket (redeemTicket
  // runs: UPDATE ledger SET player_id = realId WHERE player_id = 'ticket_xxx').
  let ledgerId = null;
  try {
    const tempPlayerId   = `ticket_${ticketId}`;
    const paymentMethod  = toLedgerPaymentMethod(order.payment_method_category);
    const paymentSource  = toLedgerPaymentSource(order.payment_method_category);
    const now            = new Date();

    ledgerId = await createExpectedPayment({
      roomId,
      clubId,
      playerId:         tempPlayerId,
      playerName:       order.supporter_name,
      ledgerType:       'entry_fee',
      amount:           entryFee,
      currency,
      paymentMethod,
      paymentSource,
      clubPaymentMethodId,
      paymentReference: order.payment_reference ?? `campaign_entry_${entryId}`,
      ticketId,
      // Already confirmed — club has verified or Stripe/crypto auto-confirmed
      status:           'confirmed',
      claimedAt:        now,
      confirmedAt:      now,
      confirmedBy:      'system',
      confirmedByName:  'Campaign Product',
      confirmedByRole:  'system',
      extraMetadata: {
        source:           'campaign_product',
        orderId,
        entryId,
        campaignId:       order.campaign_id,
        paymentCategory:  order.payment_method_category,
        // Admin note for reconciliation — visible in ledger reports
        adminNote:        `Campaign product order ${orderId}`,
      },
    });

    // Attach ledger_id to ticket — same as quizTicketService does
    if (ledgerId) {
      await connection.execute(
        `UPDATE ${T_TICKETS} SET ledger_id = ? WHERE ticket_id = ?`,
        [ledgerId, ticketId]
      );
    }

    console.log(`[TicketBridge] 📒 Ledger entry ${ledgerId} created for ticket ${ticketId} (${paymentMethod} / ${paymentSource})`);
  } catch (ledgerErr) {
    // Non-fatal — ticket and entry are already committed
    console.error(`[TicketBridge] ⚠️ Ledger entry failed (non-fatal): ${ledgerErr.message}`);
  }

  // ── 7. Send confirmation email (non-fatal) ────────────────────────────────
  try {
    const { sendTicketConfirmationEmail, getTicketWithRoomConfig } =
      await import('../../utils/ticketEmail.js');

    const ticketRow = await getTicketWithRoomConfig(ticketId);

    if (ticketRow) {
      const roomConfigForEmail = parseJson(ticketRow.config_json, {});
      const extrasForEmail     = parseJson(ticketRow.extras, []);

      await sendTicketConfirmationEmail({
        eventTitle:    config?.eventTitle    || null,
  eventLocation: config?.eventLocation || null,
        ticketId,
        purchaserEmail:  ticketRow.purchaser_email,
        purchaserName:   ticketRow.purchaser_name,
        playerName:      ticketRow.player_name,
        entryFee:        ticketRow.entry_fee,
        extrasTotal:     ticketRow.extras_total,
        totalAmount:     ticketRow.total_amount,
        currency:        ticketRow.currency,
        currencySymbol:  roomConfigForEmail?.currencySymbol ?? '€',
        extras:          extrasForEmail,
        clubId:          ticketRow.club_id,
        hostName:        roomConfigForEmail?.hostName ?? null,
        eventDateTime:   roomConfigForEmail?.eventDateTime ?? null,
        timeZone:        roomConfigForEmail?.timeZone ?? null,
        gameType,
        clubName:        ticketRow.club_name ?? null,
      });

      console.log(`[TicketBridge] 📧 Confirmation email sent to ${ticketRow.purchaser_email}`);
    }
  } catch (emailErr) {
    console.error(`[TicketBridge] ⚠️ Email failed (non-fatal): ${emailErr.message}`);
  }

  return { ticketId, joinToken, joinUrl, ledgerId };
}

// ─── Block / unblock for cash flow ───────────────────────────────────────────

/**
 * Block a ticket when a cash entry is cancelled/rejected.
 */
export async function blockTicketForEntry(entryId) {
  const [rows] = await connection.execute(
    `SELECT linked_ticket_id FROM ${T_ENTRIES} WHERE id = ? LIMIT 1`, [entryId]
  );
  const ticketId = rows[0]?.linked_ticket_id;
  if (!ticketId) return;
  await connection.execute(
    `UPDATE ${T_TICKETS} SET redemption_status = 'blocked' WHERE ticket_id = ?`,
    [ticketId]
  );
}

/**
 * Unblock (activate) a ticket when cash is confirmed.
 */
export async function unblockTicketForEntry(entryId) {
  const [rows] = await connection.execute(
    `SELECT linked_ticket_id FROM ${T_ENTRIES} WHERE id = ? LIMIT 1`, [entryId]
  );
  const ticketId = rows[0]?.linked_ticket_id;
  if (!ticketId) return;
  await connection.execute(
    `UPDATE ${T_TICKETS}
     SET redemption_status = 'ready',
         payment_status    = 'payment_confirmed'
     WHERE ticket_id = ?`,
    [ticketId]
  );
}