import { connection, TABLE_PREFIX } from '../../config/database.js';
import { expandPeerOrder } from './peerEntryExpansionService.js';
import { blockTicketForPeerEntry } from './peerTicketBridgeService.js';
const O=`${TABLE_PREFIX}peer_orders`;
const E=`${TABLE_PREFIX}peer_entries`;

const fail = (message, status=400) => { throw Object.assign(new Error(message), { status }); };

// ─── Management: confirm a manual (cash/instant) order ───────────────────────
//
// Ownership-checked version for the club admin UI. Unlike confirmPeerOrder
// below (which is called by the Stripe webhook and has no club context to
// check), this verifies the order actually belongs to the fundraiser + club
// making the request before touching anything, then expands entries exactly
// once expansion is safe (payment_status must already be 'claimed' or is set
// to 'confirmed' here from 'pending'/'claimed').
//
// This replaces the old bare status-flip confirmOrder() that used to live in
// peerCoreService.js - that version never called expandPeerOrder, so cash
// orders confirmed through the mgmt UI never produced tickets or join links.
export async function confirmPeerOrderForClub(orderId, fundraiserId, clubId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${O} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [orderId, fundraiserId, clubId]
  );
  const order = rows[0];
  if (!order) fail('peer_order_not_found', 404);
  if (!['pending', 'claimed'].includes(order.payment_status)) {
    fail('order_not_confirmable', 400);
  }

  const conn = await connection.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE ${O} SET payment_status='confirmed', confirmed_at=UTC_TIMESTAMP() WHERE id=?`,
      [orderId]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // expandPeerOrder runs its own transaction internally (see
  // peerEntryExpansionService.js) and is idempotent - if it fails partway
  // through, a retry of confirm will skip already-created entries rather
  // than duplicating them, since it checks existing confirmed/pending counts
  // first. Keeping it outside the status-update transaction above avoids
  // holding that transaction open for the duration of ticket/ledger writes.
  await expandPeerOrder(orderId);

  const [updated] = await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`, [orderId]);
  return { order: updated[0] };
}

// ─── Management: reject a manual order ────────────────────────────────────────
//
// Mirrors campaignOrderService.rejectOrder for pending/claimed orders, and
// goes further: peer previously had no way at all to reverse an order that
// had already been confirmed (real tickets + join links already exist by
// that point). If the order is 'confirmed', this now blocks every linked
// ticket via blockTicketForPeerEntry before cancelling the order and its
// entries, so a mistaken cash confirmation can actually be undone.
export async function rejectPeerOrder(orderId, fundraiserId, clubId, reason = null) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${O} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [orderId, fundraiserId, clubId]
  );
  const order = rows[0];
  if (!order) fail('peer_order_not_found', 404);
  if (!['pending', 'claimed', 'confirmed'].includes(order.payment_status)) {
    fail('order_not_rejectable', 400);
  }

  if (order.payment_status === 'confirmed') {
    const [confirmedEntries] = await connection.execute(
      `SELECT id FROM ${E} WHERE order_id=? AND status='confirmed'`,
      [orderId]
    );
    for (const entry of confirmedEntries) {
      // No-op for entries with no linked ticket (puzzle/event/custom items) -
      // blockTicketForPeerEntry just returns early if linked_ticket_id is null.
      await blockTicketForPeerEntry(entry.id);
    }
  }

  const conn = await connection.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE ${O}
       SET payment_status='cancelled',
           metadata_json=JSON_SET(COALESCE(metadata_json,'{}'), '$.rejectReason', ?, '$.rejectedFromStatus', ?)
       WHERE id=?`,
      [reason ?? 'rejected_by_club', order.payment_status, orderId]
    );
    await conn.execute(
      `UPDATE ${E} SET status='cancelled' WHERE order_id=? AND status IN ('pending_payment','confirmed')`,
      [orderId]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [updated] = await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`, [orderId]);
  return { order: updated[0] };
}

// ─── Webhook-facing: confirm by Stripe intent / session (no club context) ────
export async function confirmPeerOrder({orderId=null,stripePaymentIntentId=null,externalTransactionId=null,paymentReference=null}){
  let rows;
  if(orderId)[rows]=await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`,[orderId]);
  else [rows]=await connection.execute(`SELECT * FROM ${O} WHERE stripe_payment_intent_id=? OR stripe_checkout_session_id=? LIMIT 1`,[stripePaymentIntentId,stripePaymentIntentId]);
  const order=rows[0]; if(!order)return null;

  // NOTE: Stripe fires BOTH checkout.session.completed AND
  // payment_intent.succeeded for every Checkout Session payment, and
  // stripeWebhooks.js calls confirmPeerOrder from both - so this function
  // WILL genuinely be invoked twice, nearly simultaneously, for the same
  // order. expandPeerOrder now handles that safely itself (row-level
  // locking - see peerEntryExpansionService.js), but wrapping it here too
  // means a failure in expansion can never silently prevent the order-
  // confirmation email below from firing. Previously this call had no
  // try/catch at all - if it threw (exactly what the race could cause),
  // the email code further down never ran, even though the order's status
  // itself was already correctly set.
  if(order.payment_status==='confirmed'){
    try { await expandPeerOrder(order.id); }
    catch(expandErr){ console.error('[PeerOrderCompletion] ⚠️ Re-expansion failed (non-fatal):', expandErr.message); }
    return order;
  }

  await connection.execute(
    `UPDATE ${O} SET payment_status='confirmed',confirmed_at=UTC_TIMESTAMP(),
     stripe_payment_intent_id=COALESCE(?,stripe_payment_intent_id),external_transaction_id=COALESCE(?,external_transaction_id),
     payment_reference=COALESCE(?,payment_reference) WHERE id=?`,
    [stripePaymentIntentId,externalTransactionId,paymentReference,order.id]);

  try {
    await expandPeerOrder(order.id);
  } catch (expandErr) {
    // Order is already marked confirmed above - an expansion failure here
    // (e.g. losing the race to the other webhook event, or a genuine data
    // problem) should never stop the supporter from at least getting their
    // order-confirmation email. Logged clearly so it can be manually
    // re-expanded if entries genuinely never got created.
    console.error('[PeerOrderCompletion] ⚠️ Expansion failed (non-fatal):', expandErr.message);
  }

  // Order-confirmation email - peer had no equivalent at all. Fired here,
  // same reasoning as campaign's confirmOrderByStripeIntent: the webhook
  // always runs, unlike a frontend-triggered send that depends on the
  // supporter's tab staying open through the redirect-and-poll cycle.
  try {
    const { sendPeerOrderConfirmationEmail } = await import('./peerOrderEmailService.js');
    await sendPeerOrderConfirmationEmail(order.id);
  } catch (emailErr) {
    console.error('[PeerOrderCompletion] ⚠️ Stripe order confirmation email failed (non-fatal):', emailErr.message);
  }

  const [updated]=await connection.execute(`SELECT * FROM ${O} WHERE id=?`,[order.id]);
  return updated[0];
}
export async function cancelExpiredPeerOrder(orderId,sessionId){
  const [result]=await connection.execute(
    `UPDATE ${O} SET payment_status='cancelled',metadata_json=JSON_SET(COALESCE(metadata_json,'{}'),'$.cancelReason','stripe_session_expired','$.expiredSessionId',?)
     WHERE id=? AND payment_status='pending'`,[sessionId,orderId]);
  return {cancelled:result.affectedRows>0};
}
