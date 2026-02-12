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
  paymentReference = null,
  claimedAt = null,
  extraId = null,
  extraMetadata = null,
  ticketId = null,  // ✅ NEW
}) {
  // ✅ Check if ticket ledger entry already exists
  if (ticketId) {
    const checkSql = `
      SELECT id 
      FROM ${LEDGER_TABLE}
      WHERE ticket_id = ? 
        AND ledger_type = ?
        AND (extra_id = ? OR (extra_id IS NULL AND ? IS NULL))
      LIMIT 1
    `;
    
    const [existing] = await connection.execute(checkSql, [
      ticketId,
      ledgerType,
      extraId,
      extraId
    ]);
    
    if (existing.length > 0) {
      console.log('[Ledger] ⚠️ Ticket entry already exists, skipping:', {
        ticketId,
        ledgerType,
        extraId
      });
      return existing[0].ledger_id;
    }
  }
  
  const status = claimedAt ? 'claimed' : 'expected';
  
  const sql = `
    INSERT INTO ${LEDGER_TABLE}
      (room_id, club_id, player_id, player_name, ledger_type, amount, currency, 
       status, payment_method, payment_source, club_payment_method_id, 
       payment_reference, claimed_at, extra_id, extra_metadata, ticket_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await connection.execute(sql, [
    roomId, 
    clubId, 
    playerId, 
    playerName,
    ledgerType, 
    amount, 
    currency,
    status,
    paymentMethod, 
    paymentSource, 
    clubPaymentMethodId,
    paymentReference,
    claimedAt,
    extraId, 
    extraMetadata ? JSON.stringify(extraMetadata) : null,
    ticketId,  // ✅ NEW
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
  confirmedBy,
  confirmedByName,
  confirmedByRole,
  adminNotes,

  // ✅ NEW:
  paymentMethod = null,
  clubPaymentMethodId = null,
}) {
  const confirmerId = confirmedBy ?? null;

  if (!roomId || !playerId || !confirmerId) {
    console.warn('[Ledger] ❌ confirmPayment missing required fields', { roomId, playerId, confirmedBy });
    return { ok: false, updated: 0 };
  }

  const name = confirmedByName ?? null;
  const role = confirmedByRole ?? null;
  const notes = adminNotes ?? null;

  // ✅ Update ALL ledger rows (entry + extras)
  // ✅ Only override payment_method/club_payment_method_id if provided
  const sql = `
    UPDATE ${LEDGER_TABLE}
    SET
      status = 'confirmed',
      payment_method = COALESCE(?, payment_method),
      club_payment_method_id = COALESCE(?, club_payment_method_id),
      confirmed_at = NOW(),
      confirmed_by = ?,
      confirmed_by_name = ?,
      confirmed_by_role = ?,
      admin_notes = ?,
      updated_at = NOW()
    WHERE room_id = ?
      AND player_id = ?
      AND status IN ('claimed', 'expected')
  `;

  const params = [
    paymentMethod,                 // can be null → keep existing
    clubPaymentMethodId,           // can be null → keep existing
    confirmerId,
    name,
    role,
    notes,
    roomId,
    playerId,
  ];

  const [result] = await connection.execute(sql, params);
  return { ok: result.affectedRows > 0, updated: result.affectedRows };
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