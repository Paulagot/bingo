// server/stripe/stripeExpiredTicketService.js
//
// Shared logic for hard-deleting stale Stripe checkout records.
// Called by:
//   - stripeWebhooks.js  (checkout.session.expired event)
//   - stripeCleanupJob.js (interval-based sweep for Railway/Render)

import { connection, TABLE_PREFIX } from '../config/database.js';

const TICKETS_TABLE       = `${TABLE_PREFIX}quiz_tickets`;
const LEDGER_TABLE        = `${TABLE_PREFIX}quiz_payment_ledger`;

const DEBUG = true;

/**
 * Hard-delete a single ticket and all its ledger rows.
 * Only deletes if payment is still unconfirmed — never touches confirmed records.
 *
 * @param {string} ticketId
 * @param {string} reason  - short label for logging ('webhook_expired' | 'cron_sweep')
 * @returns {{ deleted: boolean, reason?: string }}
 */
export async function deleteExpiredTicket(ticketId, reason = 'unknown') {
  // Safety check: never delete a confirmed ticket
  const [rows] = await connection.execute(
    `SELECT id, payment_status FROM ${TICKETS_TABLE}
     WHERE ticket_id = ? LIMIT 1`,
    [ticketId]
  );

  const ticket = rows[0];
  if (!ticket) {
    if (DEBUG) console.log(`[ExpiredTicket] ⚠️ Ticket not found, nothing to delete:`, ticketId);
    return { deleted: false, reason: 'not_found' };
  }

  if (ticket.payment_status === 'payment_confirmed') {
    if (DEBUG) console.log(`[ExpiredTicket] 🛡️ Skipping confirmed ticket:`, ticketId);
    return { deleted: false, reason: 'already_confirmed' };
  }

  // Delete ledger rows first (FK child)
  const [ledgerResult] = await connection.execute(
    `DELETE FROM ${LEDGER_TABLE}
     WHERE ticket_id = ?
       AND status IN ('expected', 'claimed')`,
    [ticketId]
  );

  // Delete the ticket
  const [ticketResult] = await connection.execute(
    `DELETE FROM ${TICKETS_TABLE}
     WHERE ticket_id = ?
       AND payment_status IN ('payment_claimed', 'pending_payment')`,
    [ticketId]
  );

  if (DEBUG) {
    console.log(`[ExpiredTicket] 🗑️ Deleted expired ticket [${reason}]:`, {
      ticketId,
      ledgerRowsDeleted: ledgerResult.affectedRows,
      ticketRowsDeleted: ticketResult.affectedRows,
    });
  }

  return { deleted: ticketResult.affectedRows > 0 };
}

/**
 * Sweep all tickets whose expires_at has passed and are still unconfirmed.
 * Used by the background cleanup job.
 *
 * @returns {{ swept: number, skipped: number }}
 */
export async function sweepExpiredTickets() {
  // Find all tickets past their expiry that were never confirmed
  const [staleRows] = await connection.execute(
    `SELECT ticket_id FROM ${TICKETS_TABLE}
     WHERE expires_at IS NOT NULL
       AND expires_at < UTC_TIMESTAMP()
       AND payment_status IN ('payment_claimed', 'pending_payment')
       AND payment_method = 'stripe'`,
  );

  if (staleRows.length === 0) {
    if (DEBUG) console.log('[ExpiredTicket] ✅ Sweep complete — no stale tickets found');
    return { swept: 0, skipped: 0 };
  }

  if (DEBUG) {
    console.log(`[ExpiredTicket] 🧹 Sweeping ${staleRows.length} stale ticket(s)...`);
  }

  let swept = 0;
  let skipped = 0;

  for (const row of staleRows) {
    const result = await deleteExpiredTicket(row.ticket_id, 'cron_sweep');
    if (result.deleted) {
      swept++;
    } else {
      skipped++;
    }
  }

  console.log(`[ExpiredTicket] 🧹 Sweep done — deleted: ${swept}, skipped: ${skipped}`);
  return { swept, skipped };
}