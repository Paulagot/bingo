//server/peerFundraising/services/peerOrderCompletionServices.js
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { expandPeerOrder } from './peerEntryExpansionService.js';
import {
  blockTicketForPeerEntry,
  retryMissingPeerTicketEmails,
} from './peerTicketBridgeService.js';
import { reservePeerOrderTickets, confirmPeerOrderReservations, cancelPeerOrderReservations } from './peerTicketReservationService.js';
import {
  checkPeerOrderAllocation,
} from './peerOrderIntegrityService.js';
const O=`${TABLE_PREFIX}peer_orders`;
const E=`${TABLE_PREFIX}peer_entries`;

const fail = (message, status=400) => { throw Object.assign(new Error(message), { status }); };

async function completeFulfilmentState(orderId) {
  const allocation = await checkPeerOrderAllocation(
    orderId,
    { persist:true },
  );

  const fulfilmentStatus =
    allocation.status === 'balanced'
      ? 'complete'
      : 'attention_required';

  await connection.execute(
    `UPDATE ${O}
     SET metadata_json=JSON_SET(
       COALESCE(metadata_json,'{}'),
       '$.fulfilmentStatus', ?,
       '$.fulfilmentCompletedAt', UTC_TIMESTAMP(),
       '$.fulfilmentError', NULL
     )
     WHERE id=?`,
    [fulfilmentStatus,orderId],
  );

  console.log('[PeerOrderCompletion] Fulfilment state complete:', {
    orderId,
    fulfilmentStatus,
    allocationStatus: allocation.status,
    orderTotal: allocation.orderTotal,
    ledgerTotal: allocation.ledgerTotal,
    difference: allocation.difference,
    ledgerCount: allocation.ledgerCount,
  });

  return allocation;
}

// ─── Management: confirm a manual (cash/instant) order ───────────────────────
export async function confirmPeerOrderForClub(orderId, fundraiserId, clubId) {
  console.log('[PeerOrderCompletion] confirmPeerOrderForClub called:', { orderId, fundraiserId, clubId });

  const [rows] = await connection.execute(
    `SELECT * FROM ${O} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [orderId, fundraiserId, clubId]
  );
  const order = rows[0];
  if (!order) fail('peer_order_not_found', 404);
  if (order.payment_status !== 'claimed') {
    fail('order_not_confirmable', 400);
  }

  console.log('[PeerOrderCompletion] Reserving tickets for club order:', {
    orderId,
    paymentMethodCategory: order.payment_method_category,
  });

  await reservePeerOrderTickets({
    orderId,
    paymentCategory:order.payment_method_category,
    paymentReference:order.payment_reference,
    clubPaymentMethodId:order.club_payment_method_id,
  });

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

  console.log('[PeerOrderCompletion] Order status set to confirmed:', { orderId });

  try {
    console.log('[PeerOrderCompletion] Confirming reservations:', { orderId });
    await confirmPeerOrderReservations({
      orderId,
      paymentReference: order.payment_reference,
      externalTransactionId: order.external_transaction_id,
    });

    console.log('[PeerOrderCompletion] Expanding order:', { orderId });
    await expandPeerOrder(orderId);

    console.log('[PeerOrderCompletion] Retrying missing ticket emails:', { orderId });
    const ticketEmails = await retryMissingPeerTicketEmails(orderId);

    const allocation = await completeFulfilmentState(orderId);

    const [updated] = await connection.execute(
      `SELECT * FROM ${O} WHERE id=? LIMIT 1`,
      [orderId],
    );
    return {
      order: updated[0],
      ticketEmails,
      allocation,
    };
  } catch(error) {
    console.error('[PeerOrderCompletion] Fulfilment failed (club confirm):', {
      orderId,
      error: error.message,
      failures: error.failures || null,
    });
    await connection.execute(
      `UPDATE ${O}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.fulfilmentStatus','failed',
         '$.fulfilmentError',?,
         '$.fulfilmentFailedAt',UTC_TIMESTAMP()
       )
       WHERE id=?`,
      [error.message,orderId],
    );
    throw error;
  }
}

// ─── Management: reject a manual order ────────────────────────────────────────
export async function rejectPeerOrder(orderId, fundraiserId, clubId, reason = null) {
  console.log('[PeerOrderCompletion] rejectPeerOrder called:', { orderId, fundraiserId, clubId, reason });

  const [rows] = await connection.execute(
    `SELECT * FROM ${O} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [orderId, fundraiserId, clubId]
  );
  const order = rows[0];
  if (!order) fail('peer_order_not_found', 404);
  if (!['claimed', 'confirmed'].includes(order.payment_status)) {
    fail('order_not_rejectable', 400);
  }

  if (order.payment_status === 'claimed') {
    console.log('[PeerOrderCompletion] Cancelling reservations for claimed order:', { orderId });
    await cancelPeerOrderReservations(orderId);
  }

  if (order.payment_status === 'confirmed') {
    const [confirmedEntries] = await connection.execute(
      `SELECT id FROM ${E} WHERE order_id=? AND status='confirmed'`,
      [orderId]
    );
    console.log('[PeerOrderCompletion] Blocking tickets for confirmed order:', {
      orderId,
      entryCount: confirmedEntries.length,
    });
    for (const entry of confirmedEntries) {
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

  console.log('[PeerOrderCompletion] Order rejected:', { orderId, reason });

  const [updated] = await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`, [orderId]);
  return { order: updated[0] };
}

// ─── Webhook-facing: confirm by Stripe intent / session (no club context) ────
export async function confirmPeerOrder({orderId=null,stripePaymentIntentId=null,externalTransactionId=null,paymentReference=null}){
  console.log('[PeerOrderCompletion] confirmPeerOrder called:', {
    orderId,
    stripePaymentIntentId,
    externalTransactionId,
    paymentReference,
  });

  let rows;
  if(orderId)[rows]=await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`,[orderId]);
  else [rows]=await connection.execute(`SELECT * FROM ${O} WHERE stripe_payment_intent_id=? OR stripe_checkout_session_id=? LIMIT 1`,[stripePaymentIntentId,stripePaymentIntentId]);
  const order=rows[0];
  if(!order){
    console.warn('[PeerOrderCompletion] Order not found:', { orderId, stripePaymentIntentId });
    return null;
  }

  console.log('[PeerOrderCompletion] Order located:', {
    orderId: order.id,
    paymentStatus: order.payment_status,
    supporterEmail: order.supporter_email,
  });

  if(order.payment_status==='confirmed'){
    console.log('[PeerOrderCompletion] Reprocessing already-confirmed order:', { orderId: order.id });
    try {
      const reservationResult = await confirmPeerOrderReservations({
        orderId: order.id,
        paymentReference,
        externalTransactionId: externalTransactionId || stripePaymentIntentId,
      });
      console.log('[PeerOrderCompletion] Reservations confirmed (reprocess):', { orderId: order.id, reservationResult });

      const expansionResult = await expandPeerOrder(order.id);
      console.log('[PeerOrderCompletion] Expansion complete (reprocess):', { orderId: order.id, expansionResult });

      const ticketEmailResult = await retryMissingPeerTicketEmails(order.id);
      console.log('[PeerOrderCompletion] Ticket emails (reprocess):', { orderId: order.id, ticketEmailResult });

      const allocationResult = await completeFulfilmentState(order.id);
      console.log('[PeerOrderCompletion] Reprocessing complete:', {
        orderId: order.id,
        allocationStatus: allocationResult?.status,
      });
    } catch(expandErr) {
      console.error('[PeerOrderCompletion] Re-expansion failed:', {
        orderId: order.id,
        error: expandErr.message,
        failures: expandErr.failures || null,
      });
      await connection.execute(
        `UPDATE ${O}
         SET metadata_json=JSON_SET(
           COALESCE(metadata_json,'{}'),
           '$.fulfilmentStatus','failed',
           '$.fulfilmentError',?,
           '$.fulfilmentFailedAt',UTC_TIMESTAMP()
         )
         WHERE id=?`,
        [expandErr.message,order.id],
      );
    }
    const [updated]=await connection.execute(
      `SELECT * FROM ${O} WHERE id=? LIMIT 1`,
      [order.id],
    );
    return updated[0];
  }

  await connection.execute(
    `UPDATE ${O} SET payment_status='confirmed',confirmed_at=UTC_TIMESTAMP(),
     stripe_payment_intent_id=COALESCE(?,stripe_payment_intent_id),external_transaction_id=COALESCE(?,external_transaction_id),
     payment_reference=COALESCE(?,payment_reference) WHERE id=?`,
    [stripePaymentIntentId,externalTransactionId,paymentReference,order.id]);

  console.log('[PeerOrderCompletion] Order status set to confirmed:', { orderId: order.id });

  try {
    console.log('[PeerOrderCompletion] Starting fulfilment:', {
      orderId: order.id,
      paymentStatusBefore: order.payment_status,
      stripePaymentIntentId,
    });

    const reservationResult = await confirmPeerOrderReservations({
      orderId: order.id,
      paymentReference,
      externalTransactionId: externalTransactionId || stripePaymentIntentId,
    });
    console.log('[PeerOrderCompletion] Reservations confirmed:', { orderId: order.id, reservationResult });

    const expansionResult = await expandPeerOrder(order.id);
    console.log('[PeerOrderCompletion] Expansion complete:', { orderId: order.id, expansionResult });

    const ticketEmailResult = await retryMissingPeerTicketEmails(order.id);
    console.log('[PeerOrderCompletion] Ticket emails:', { orderId: order.id, ticketEmailResult });

    const allocationResult = await completeFulfilmentState(order.id);
    console.log('[PeerOrderCompletion] Fulfilment complete:', {
      orderId: order.id,
      allocationStatus: allocationResult?.status,
    });
  } catch (expandErr) {
    console.error('[PeerOrderCompletion] Expansion failed:', {
      orderId: order.id,
      error: expandErr.message,
      failures: expandErr.failures || null,
    });
    await connection.execute(
      `UPDATE ${O}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.fulfilmentStatus','failed',
         '$.fulfilmentError',?,
         '$.fulfilmentFailedAt',UTC_TIMESTAMP()
       )
       WHERE id=?`,
      [expandErr.message,order.id],
    );
  }

  try {
    const { sendPeerOrderConfirmationEmail } = await import('./peerOrderEmailService.js');
    await sendPeerOrderConfirmationEmail(order.id);
  } catch (emailErr) {
    console.error('[PeerOrderCompletion] ⚠️ Order confirmation email failed (non-fatal):', {
      orderId: order.id,
      error: emailErr.message,
    });
  }

  const [updated]=await connection.execute(`SELECT * FROM ${O} WHERE id=?`,[order.id]);
  return updated[0];
}

export async function retryPeerOrderFulfilment(orderId, fundraiserId, clubId) {
  console.log('[PeerOrderCompletion] retryPeerOrderFulfilment called:', { orderId, fundraiserId, clubId });

  const [rows]=await connection.execute(
    `SELECT * FROM ${O} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [orderId,fundraiserId,clubId],
  );
  const order=rows[0];
  if(!order) fail('peer_order_not_found',404);
  if(order.payment_status!=='confirmed'){
    fail('order_not_confirmed',400);
  }

  await connection.execute(
    `UPDATE ${O}
     SET metadata_json=JSON_SET(
       COALESCE(metadata_json,'{}'),
       '$.fulfilmentStatus','retrying',
       '$.fulfilmentRetryStartedAt',UTC_TIMESTAMP(),
       '$.fulfilmentError',NULL
     )
     WHERE id=?`,
    [orderId],
  );

  try {
    console.log('[PeerOrderCompletion] Retry: expanding order:', { orderId });
    const expansion = await expandPeerOrder(orderId);

    console.log('[PeerOrderCompletion] Retry: sending missing ticket emails:', { orderId });
    const ticketEmails = await retryMissingPeerTicketEmails(orderId);

    const allocation = await completeFulfilmentState(orderId);

    const [updated]=await connection.execute(
      `SELECT * FROM ${O} WHERE id=? LIMIT 1`,
      [orderId],
    );

    console.log('[PeerOrderCompletion] Retry complete:', {
      orderId,
      expansionCount: expansion?.createdCount,
      allocationStatus: allocation?.status,
    });

    return {
      order: updated[0],
      expansion,
      ticketEmails,
      allocation,
    };
  } catch(error) {
    console.error('[PeerOrderCompletion] Retry failed:', {
      orderId,
      error: error.message,
      failures: error.failures || null,
    });
    await connection.execute(
      `UPDATE ${O}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.fulfilmentStatus','failed',
         '$.fulfilmentError',?,
         '$.fulfilmentFailedAt',UTC_TIMESTAMP()
       )
       WHERE id=?`,
      [error.message,orderId],
    );
    throw error;
  }
}

export async function cancelExpiredPeerOrder(orderId,sessionId){
  console.log('[PeerOrderCompletion] cancelExpiredPeerOrder called:', { orderId, sessionId });
  const [result]=await connection.execute(
    `UPDATE ${O} SET payment_status='cancelled',metadata_json=JSON_SET(COALESCE(metadata_json,'{}'),'$.cancelReason','stripe_session_expired','$.expiredSessionId',?)
     WHERE id=? AND payment_status='pending'`,[sessionId,orderId]);
  if(result.affectedRows>0) {
    console.log('[PeerOrderCompletion] Expired order cancelled, cancelling reservations:', { orderId });
    await cancelPeerOrderReservations(orderId);
  }
  return {cancelled:result.affectedRows>0};
}
