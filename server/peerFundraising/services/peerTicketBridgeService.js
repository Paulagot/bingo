import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';

const E = `${TABLE_PREFIX}peer_entries`;
const T = `${TABLE_PREFIX}quiz_tickets`;
const R = `${TABLE_PREFIX}web2_quiz_rooms`;

const parseJson = (v,f={}) => { if(!v)return f; if(typeof v==='object')return v; try{return JSON.parse(v)}catch{return f} };
const gameTypeFromItemType = itemType => itemType === 'elimination_entry' ? 'elimination' : 'quiz';
const paymentMethod = cat => ({stripe:'stripe',crypto:'crypto',instant_payment:'instant_payment',bank_transfer:'instant_payment',cash_to_participant:'cash',cash:'cash',card:'card',card_tap:'card_tap'}[cat] || 'other');
const paymentSource = cat => cat === 'stripe' ? 'webhook_auto' : cat === 'crypto' ? 'onchain_auto' : 'admin_assigned';

export async function createTicketForPeerEntry(entryId, context) {
  const { order, packItem, apportionedFee, clubPaymentMethodId } = context;
  const ticketId = nanoid(12), joinToken = nanoid(16), roomId = packItem.target_room_id;
  const [rooms] = await connection.execute(`SELECT config_json, game_type FROM ${R} WHERE room_id=? AND club_id=? LIMIT 1`, [roomId,order.club_id]);
  if (!rooms[0]) throw new Error(`room_not_found:${roomId}`);
  const cfg = parseJson(rooms[0].config_json, {});
  const extras = Object.entries(cfg.fundraisingOptions || {}).filter(([,v])=>v===true).map(([extraId])=>({extraId,price:0,source:'peer_pack',included:true}));
  const fee = Number(apportionedFee || 0);
  // Previously derived purely from packItem.item_type, which is only ever
  // set once, manually, at pack-build time — nothing stopped it from being
  // wrong. peerEntryExpansionService.js now corrects item_type against the
  // room before this function is even called, but deriving it again here,
  // independently, directly from the room's own game_type column is a
  // second, cheap backstop against exactly this class of bug recurring.
  const gt = rooms[0].game_type === 'elimination' ? 'elimination' : rooms[0].game_type === 'quiz' ? 'quiz' : gameTypeFromItemType(packItem.item_type);

  await connection.execute(
    `INSERT INTO ${T}
      (ticket_id,room_id,club_id,purchaser_name,purchaser_email,purchaser_phone,player_name,
       entry_fee,extras,extras_total,total_amount,currency,payment_status,payment_method,
       payment_reference,club_payment_method_id,redemption_status,join_token,
       confirmed_at,confirmed_by,confirmed_by_name,confirmed_by_role,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,0,?,?,'payment_confirmed','peer_pack',?,?, 'ready',?,UTC_TIMESTAMP(),
             'system','Peer-to-Peer Pack','system',UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [ticketId,roomId,order.club_id,order.supporter_name,order.supporter_email,order.supporter_phone,
     order.supporter_name,fee,JSON.stringify(extras),fee,order.currency,`peer_entry_${entryId}`,
     clubPaymentMethodId || null,joinToken]
  );

  // Previously pointed straight into /join/{gameType}/{roomId} — dropping
  // a buyer directly into the live-join route immediately after purchase,
  // even when the event itself might be weeks away. Point at the ticket
  // status page instead; that page is responsible for showing the actual
  // join link once the room is live.
  const joinUrl = `/tickets/status/${ticketId}`;
  await connection.execute(
    `UPDATE ${E} SET status='confirmed',entry_code=?,ticket_code=?,join_url=?,linked_ticket_id=?,confirmed_at=UTC_TIMESTAMP() WHERE id=?`,
    [`PE-${nanoid(8).toUpperCase()}`,ticketId,joinUrl,ticketId,entryId]
  );

  // Capture the ledger ID and write it back onto the ticket — previously
  // this call's return value was discarded entirely, so tickets.ledger_id
  // was always left null for peer tickets. Any reporting that joins on
  // tickets.ledger_id would silently show peer tickets as unlinked.
  const ledgerId = await createExpectedPayment({
    roomId, clubId: order.club_id, playerId: `ticket_${ticketId}`,
    playerName: order.supporter_name, ledgerType: 'entry_fee', amount: fee,
    currency: order.currency, paymentMethod: paymentMethod(order.payment_method_category),
    paymentSource: paymentSource(order.payment_method_category),
    clubPaymentMethodId: clubPaymentMethodId || null,
    paymentReference: order.payment_reference || `peer_order_${order.id}`,
    externalTransactionId: order.external_transaction_id || null,
    status: 'confirmed', confirmedAt: new Date(), confirmedBy: paymentSource(order.payment_method_category),
    confirmedByName: order.payment_method_category === 'stripe' ? 'Stripe' : order.payment_method_category === 'crypto' ? 'Solana' : 'Club Admin',
    confirmedByRole: 'system', ticketId,
    extraMetadata: { peerFundraiserId: order.peer_fundraiser_id, peerOrderId: order.id, peerEntryId: entryId },
  });

  if (ledgerId) {
    await connection.execute(`UPDATE ${T} SET ledger_id=? WHERE ticket_id=?`, [ledgerId, ticketId]);
  }

  // Per-ticket confirmation email — peer had no equivalent to campaign's
  // step 7 in campaignTicketBridgeService.js at all. Note: campaign's
  // version references an undeclared `config` variable (should be
  // `roomConfigForEmail`), which throws inside the try/catch and silently
  // no-ops every time — campaign ticket emails are currently broken in
  // production. Not copied here; `roomConfigForEmail` is used correctly.
  try {
    const { sendTicketConfirmationEmail, getTicketWithRoomConfig } =
      await import('../../utils/ticketEmail.js');

    const ticketRow = await getTicketWithRoomConfig(ticketId);

    if (ticketRow) {
      const roomConfigForEmail = parseJson(ticketRow.config_json, {});
      const extrasForEmail     = parseJson(ticketRow.extras, []);

      await sendTicketConfirmationEmail({
        eventTitle:      roomConfigForEmail?.eventTitle    || null,
        eventLocation:   roomConfigForEmail?.eventLocation || null,
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
        gameType:        gt,
        clubName:        ticketRow.club_name ?? null,
      });

      console.log(`[PeerTicketBridge] 📧 Confirmation email sent to ${ticketRow.purchaser_email}`);
    }
  } catch (emailErr) {
    console.error(`[PeerTicketBridge] ⚠️ Email failed (non-fatal): ${emailErr.message}`);
  }

  return { ticketId, joinToken, joinUrl, ledgerId };
}

// ─── Block / unblock ──────────────────────────────────────────────────────
// Campaign has these (blockTicketForEntry/unblockTicketForEntry); peer had
// no equivalent, which meant a confirmed order — one that already has real
// quiz_tickets rows and a join link out in the world — could never be
// undone. rejectPeerOrder can now call blockTicketForPeerEntry when
// reversing an order that was already confirmed.

export async function blockTicketForPeerEntry(entryId) {
  const [rows] = await connection.execute(
    `SELECT linked_ticket_id FROM ${E} WHERE id=? LIMIT 1`, [entryId]
  );
  const ticketId = rows[0]?.linked_ticket_id;
  if (!ticketId) return;
  await connection.execute(
    `UPDATE ${T} SET redemption_status='blocked' WHERE ticket_id=?`,
    [ticketId]
  );
}

export async function unblockTicketForPeerEntry(entryId) {
  const [rows] = await connection.execute(
    `SELECT linked_ticket_id FROM ${E} WHERE id=? LIMIT 1`, [entryId]
  );
  const ticketId = rows[0]?.linked_ticket_id;
  if (!ticketId) return;
  await connection.execute(
    `UPDATE ${T} SET redemption_status='ready', payment_status='payment_confirmed' WHERE ticket_id=?`,
    [ticketId]
  );
}
