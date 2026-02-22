//server/stripe/stripeService.js
import { connection, TABLE_PREFIX } from '../config/database.js';

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

export async function getStripeMethodForClub(clubId) {
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

export async function upsertStripeMethodForClub({ clubId, accountId, connectStatus, addedBy }) {
  const existing = await getStripeMethodForClub(clubId);

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
      VALUES (?, 'stripe', 'stripe', ?, 0, TRUE, ?, ?, ?, TRUE)
    `;
    const label = 'Card (Stripe)';
    const instructions = 'Pay securely by card.';
    const [result] = await connection.execute(insertSql, [
      clubId,
      label,
      instructions,
      JSON.stringify(methodConfig),
      addedBy || null,
    ]);
    return result.insertId;
  }

  const updateSql = `
    UPDATE ${METHODS_TABLE}
    SET
      is_enabled = TRUE,
      method_config = ?,
      updated_at = NOW()
    WHERE id = ? AND club_id = ?
  `;

  await connection.execute(updateSql, [
    JSON.stringify(methodConfig),
    existing.id,
    clubId,
  ]);

  return existing.id;
}