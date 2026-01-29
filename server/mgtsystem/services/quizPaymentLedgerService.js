// Payment Ledger Service - Audit trail for all payments
//src/server/mgtsystem/services/quizPaymentLedgerService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

/**
 * Create a ledger entry for expected payment (player joining)
 */
/**
 * Create a ledger entry for expected payment (player joining)
 * Can create as 'expected' OR 'claimed' depending on paymentClaimed flag
 */
export async function createExpectedPayment({
  roomId,
  clubId,
  playerId,
  playerName,
  ledgerType,
  amount,
  currency = 'EUR',
  paymentMethod = 'unknown',
  paymentSource = 'player_selected',
  clubPaymentMethodId = null,
  paymentReference = null, // ✅ ADD THIS
  claimedAt = null, // ✅ ADD THIS
  extraId = null,
  extraMetadata = null,
}) {
  // ✅ Determine status based on whether it was claimed
  const status = claimedAt ? 'claimed' : 'expected';
  
  const sql = `
    INSERT INTO fundraisely_quiz_payment_ledger
      (room_id, club_id, player_id, player_name, ledger_type, amount, currency, 
       status, payment_method, payment_source, club_payment_method_id, 
       payment_reference, claimed_at, extra_id, extra_metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await connection.execute(sql, [
    roomId, 
    clubId, 
    playerId, 
    playerName,
    ledgerType, 
    amount, 
    currency,
    status, // ✅ Dynamic: 'expected' or 'claimed'
    paymentMethod, 
    paymentSource, 
    clubPaymentMethodId,
    paymentReference, // ✅ NEW
    claimedAt, // ✅ NEW
    extraId, 
    extraMetadata ? JSON.stringify(extraMetadata) : null
  ]);
  
  return result.insertId;
}

/**
 * Player claims they've paid (instant payment flow)
 */

export async function claimPayment({
  roomId,
  playerId,
  paymentReference,
  paymentMethod,
  clubPaymentMethodId = null, // ✅ NEW: Track which payment method
  claimedBy = playerId,
}) {
  const sql = `
    UPDATE ${LEDGER_TABLE}
    SET 
      status = 'claimed',
      payment_reference = ?,
      payment_method = ?,
      club_payment_method_id = ?,
      claimed_at = NOW(),
      claimed_by = ?,
      payment_source = 'player_claimed',
      updated_at = NOW()
    WHERE room_id = ? 
      AND player_id = ? 
      AND status = 'expected'
  `;
  
  const [result] = await connection.execute(sql, [
    paymentReference, 
    paymentMethod, 
    clubPaymentMethodId,
    claimedBy, 
    roomId, 
    playerId
  ]);
  
  return result.affectedRows > 0;
}

/**
 * Admin confirms payment (manual approval)
 */
export async function confirmPayment({
  roomId,
  playerId,
  confirmedBy, // admin/host user_id
  paymentMethod = null, // ✅ NEW: Allow admin to specify actual method
  clubPaymentMethodId = null, // ✅ NEW
  adminNotes = null,
}) {
  // Build dynamic SQL based on what's provided
  const updates = [
    "status = 'confirmed'",
    "confirmed_at = NOW()",
    "confirmed_by = ?",
    "updated_at = NOW()"
  ];
  
  const params = [confirmedBy];
  
  if (paymentMethod) {
    updates.push("payment_method = ?");
    params.push(paymentMethod);
  }
  
  if (clubPaymentMethodId) {
    updates.push("club_payment_method_id = ?");
    params.push(clubPaymentMethodId);
  }
  
  if (adminNotes) {
    updates.push("admin_notes = ?");
    params.push(adminNotes);
  }
  
  // Add WHERE clause params
  params.push(roomId, playerId);
  
  const sql = `
    UPDATE fundraisely_quiz_payment_ledger
    SET ${updates.join(', ')}
    WHERE room_id = ? 
      AND player_id = ? 
      AND status IN ('expected', 'claimed')
  `;
  
  const [result] = await connection.execute(sql, params);
  
  return result.affectedRows > 0;
}

/**
 * Get payment summary for a room (for reconciliation)
 */
export async function getRoomPaymentSummary(roomId) {
  const sql = `
    SELECT 
      payment_method,
      status,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM ${LEDGER_TABLE}
    WHERE room_id = ?
    GROUP BY payment_method, status
  `;
  
  const [rows] = await connection.execute(sql, [roomId]);
  return rows;
}

/**
 * Get all ledger entries for a player in a room
 */
export async function getPlayerLedger(roomId, playerId) {
  const sql = `
    SELECT *
    FROM ${LEDGER_TABLE}
    WHERE room_id = ? AND player_id = ?
    ORDER BY created_at DESC
  `;
  
  const [rows] = await connection.execute(sql, [roomId, playerId]);
  return rows;
}

/**
 * Webhook auto-confirm (Stripe, future)
 */
export async function webhookConfirmPayment({
  externalTransactionId,
  paymentMethod = 'stripe',
}) {
  const sql = `
    UPDATE ${LEDGER_TABLE}
    SET 
      status = 'confirmed',
      confirmed_at = NOW(),
      confirmed_by = 'webhook_auto',
      payment_source = 'webhook_auto',
      external_transaction_id = ?,
      updated_at = NOW()
    WHERE payment_reference = ? 
      AND status = 'claimed'
      AND payment_method = ?
  `;
  
  // Note: This assumes payment_reference matches Stripe metadata
  const [result] = await connection.execute(sql, [
    externalTransactionId, externalTransactionId, paymentMethod
  ]);
  
  return result.affectedRows > 0;
}