// server/peerFundraising/services/peerOrderIntegrityService.js
//
// Automatic financial integrity check for peer orders.
// This is not the club's formal event reconciliation. It confirms that the
// confirmed payment-ledger allocations created by peer fulfilment equal the
// confirmed peer order total.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const O = `${TABLE_PREFIX}peer_orders`;
const E = `${TABLE_PREFIX}peer_entries`;
const L = `${TABLE_PREFIX}quiz_payment_ledger`;

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

export async function checkPeerOrderAllocation(orderId, {
  persist = true,
} = {}) {
  const [orderRows] = await connection.execute(
    `SELECT id,total_amount,currency,metadata_json
     FROM ${O}
     WHERE id=?
     LIMIT 1`,
    [orderId],
  );

  const order = orderRows[0];
  if (!order) throw new Error('peer_order_not_found');

  // Primary match: fulfilment services put peerOrderId in extra_metadata.
  // Fallback match: ledgers linked to tickets created for this order.
  const [ledgerRows] = await connection.execute(
    `SELECT
       l.id,
       l.room_id,
       l.ledger_type,
       l.amount,
       l.status,
       l.ticket_id
     FROM ${L} l
     WHERE l.status='confirmed'
       AND (
         JSON_UNQUOTE(
           JSON_EXTRACT(l.extra_metadata,'$.peerOrderId')
         )=?
         OR l.ticket_id IN (
           SELECT linked_ticket_id
           FROM ${E}
           WHERE order_id=?
             AND linked_ticket_id IS NOT NULL
         )
         OR l.id IN (
           SELECT CAST(
             JSON_UNQUOTE(
               JSON_EXTRACT(metadata_json,'$.ledgerId')
             ) AS UNSIGNED
           )
           FROM ${E}
           WHERE order_id=?
             AND JSON_EXTRACT(
               metadata_json,'$.ledgerId'
             ) IS NOT NULL
         )
       )
     ORDER BY l.id`,
    [orderId, orderId, orderId],
  );

  // Avoid double counting a row matched by more than one path.
  const unique = new Map();
  for (const row of ledgerRows) unique.set(String(row.id), row);
  const allocations = [...unique.values()];

  const orderTotal = Number(order.total_amount || 0);
  const ledgerTotal = Number(
    allocations
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
      .toFixed(2),
  );
  const difference = Number((ledgerTotal - orderTotal).toFixed(2));
  const status = Math.abs(difference) <= 0.01
    ? 'balanced'
    : 'out_of_balance';

  const result = {
    status,
    orderTotal,
    ledgerTotal,
    difference,
    currency: order.currency || 'EUR',
    ledgerCount: allocations.length,
    allocations: allocations.map(row => ({
      ledgerId: row.id,
      roomId: row.room_id,
      ledgerType: row.ledger_type,
      amount: Number(row.amount),
      ticketId: row.ticket_id || null,
    })),
  };

  if (persist) {
    await connection.execute(
      `UPDATE ${O}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.allocationStatus', ?,
         '$.allocationCheck.orderTotal', ?,
         '$.allocationCheck.ledgerTotal', ?,
         '$.allocationCheck.difference', ?,
         '$.allocationCheck.currency', ?,
         '$.allocationCheck.ledgerCount', ?,
         '$.allocationCheck.checkedAt', UTC_TIMESTAMP()
       )
       WHERE id=?`,
      [
        status,
        orderTotal,
        ledgerTotal,
        difference,
        order.currency || 'EUR',
        allocations.length,
        orderId,
      ],
    );
  }

  return result;
}

export async function getPeerOrderOperationalStatus(orderId) {
  const [rows] = await connection.execute(
    `SELECT
       o.*,
       COUNT(e.id) AS entry_count,
       SUM(e.status='confirmed') AS confirmed_entry_count,
       SUM(e.status='pending_payment') AS pending_entry_count,
       SUM(
         JSON_EXTRACT(
           e.metadata_json,'$.expansionError'
         ) IS NOT NULL
       ) AS failed_entry_count
     FROM ${O} o
     LEFT JOIN ${E} e ON e.order_id=o.id
     WHERE o.id=?
     GROUP BY o.id`,
    [orderId],
  );

  const order = rows[0];
  if (!order) throw new Error('peer_order_not_found');

  const metadata = parseJson(order.metadata_json, {});
  return {
    order,
    metadata,
    fulfilmentStatus:
      metadata.fulfilmentStatus ||
      (order.payment_status === 'confirmed'
        ? 'pending'
        : 'not_started'),
    allocationStatus:
      metadata.allocationStatus || 'pending',
  };
}
