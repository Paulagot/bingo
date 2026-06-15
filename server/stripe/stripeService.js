// server/stripe/stripeService.js
import { connection, TABLE_PREFIX } from '../config/database.js';

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

/**
 * Get the active Stripe method for a club.
 *
 * Skips any row that has been disconnected (connect.disconnectedAt is set).
 * Disconnected rows are kept in the DB so historical ledger/report joins on
 * club_payment_method_id continue to resolve — they are just invisible to
 * all active payment flows.
 *
 * Returns the most recently created non-disconnected stripe row, or null.
 */
export async function getStripeMethodForClub(clubId) {
  const sql = `
    SELECT *
    FROM ${METHODS_TABLE}
    WHERE club_id = ?
      AND method_category = 'stripe'
      AND (
        JSON_EXTRACT(method_config, '$.connect.disconnectedAt') IS NULL
        OR JSON_EXTRACT(method_config, '$.connect.disconnectedAt') = CAST('null' AS JSON)
      )
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [rows] = await connection.execute(sql, [clubId]);
  return rows[0] || null;
}

/**
 * Get the most recent Stripe row for a club regardless of disconnected state.
 *
 * Used only for UI display — lets the frontend show previously disconnected
 * account details (accountId, disconnectedAt, disconnectedBy) so the admin
 * knows what was there before and can make an informed decision about whether
 * to reconnect the same account or start fresh.
 *
 * Never used in payment flows — use getStripeMethodForClub for those.
 */
export async function getMostRecentStripeRowForClub(clubId) {
  const sql = `
    SELECT *
    FROM ${METHODS_TABLE}
    WHERE club_id = ?
      AND method_category = 'stripe'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [rows] = await connection.execute(sql, [clubId]);
  return rows[0] || null;
}

/**
 * Insert or update the Stripe method row for a club.
 *
 * is_enabled is gated on all three Stripe flags being true:
 *   chargesEnabled + payoutsEnabled + detailsSubmitted
 *
 * If any one is false the row is saved with is_enabled: false so the club UI
 * shows "Setup incomplete" and players cannot reach the Stripe checkout.
 *
 * Only touches non-disconnected rows — disconnected rows are never updated
 * because getStripeMethodForClub already filters them out.
 */
export async function upsertStripeMethodForClub({ clubId, accountId, connectStatus, addedBy }) {
  const existing = await getStripeMethodForClub(clubId);

  // All three Stripe flags must be true before we allow card payments
  const isReady = !!(
    connectStatus?.chargesEnabled &&
    connectStatus?.payoutsEnabled &&
    connectStatus?.detailsSubmitted
  );

  const methodConfig = {
    connect: {
      accountId,
      ...connectStatus,
      updatedAt: new Date().toISOString(),
    },
  };

  if (!existing) {
    const insertSql = `
      INSERT INTO ${METHODS_TABLE}
        (club_id, method_category, provider_name, method_label,
         display_order, is_enabled, player_instructions, method_config,
         added_by, is_official_club_account)
      VALUES (?, 'stripe', 'stripe', ?, 0, ?, ?, ?, ?, TRUE)
    `;
    const [result] = await connection.execute(insertSql, [
      clubId,
      'Card (Stripe)',
      isReady,                        // false until all three flags pass
      'Pay securely by card.',
      JSON.stringify(methodConfig),
      addedBy || null,
    ]);
    return result.insertId;
  }

  const updateSql = `
    UPDATE ${METHODS_TABLE}
    SET
      is_enabled    = ?,
      method_config = ?,
      updated_at    = UTC_TIMESTAMP()
    WHERE id = ? AND club_id = ?
  `;

  await connection.execute(updateSql, [
    isReady,                          // false until all three flags pass
    JSON.stringify(methodConfig),
    existing.id,
    clubId,
  ]);

  return existing.id;
}