import { connection, TABLE_PREFIX } from '../../config/database.js';
import { normalizePaymentMethod } from '../../utils/paymentMethods.js';

const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

export async function getUnpaidPlayersForRoom(roomId) {
  const sql = `
    SELECT
      player_id AS playerId,
      MAX(player_name) AS playerName,
      SUM(CASE WHEN ledger_type='entry_fee' THEN amount ELSE 0 END) AS entryFeeOutstanding,
      SUM(CASE WHEN ledger_type='extra_purchase' THEN amount ELSE 0 END) AS extrasOutstanding,
      SUM(amount) AS totalOutstanding,
      MAX(updated_at) AS lastUpdatedAt
    FROM ${LEDGER_TABLE}
    WHERE room_id = ?
      AND status IN ('expected','claimed')
    GROUP BY player_id
    ORDER BY playerName ASC
  `;

  const [rows] = await connection.execute(sql, [roomId]);
  return rows;
}

/**
 * Mark a player's outstanding ledger rows as confirmed + flag them as late.
 * This is intentionally DB-driven (post-event).
 */
export async function markPlayerPaidLate({
  roomId,
  playerId,
  confirmedBy,
  confirmedByName,
  confirmedByRole,
  adminNotes = null,
  paymentMethod = null,
  clubPaymentMethodId = null,
}) {
  if (!roomId || !playerId || !confirmedBy) {
    return { ok: false, updated: 0, error: 'Missing required fields' };
  }

  const canonical = paymentMethod ? normalizePaymentMethod(paymentMethod) : null;

  const sql = `
    UPDATE ${LEDGER_TABLE}
    SET
      status = 'confirmed',
      is_late = 1,
      payment_source = 'admin_assigned',
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
      AND status IN ('expected', 'claimed')
  `;

  const params = [
    canonical,                 // nullable override
    clubPaymentMethodId,       // nullable override
    confirmedBy,
    confirmedByName ?? null,
    confirmedByRole ?? null,
    adminNotes,
    roomId,
    playerId,
  ];

  const [result] = await connection.execute(sql, params);

  return { ok: result.affectedRows > 0, updated: result.affectedRows };
}
