//src/server/mgtsystem/services/paymentMethodsService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

/**
 * Get enabled payment methods for a club
 */
export async function getClubPaymentMethods(clubId) {
  const sql = `
    SELECT 
      id,
      method_category,
      provider_name,
      method_label,
      display_order,
      player_instructions,
      method_config
    FROM ${METHODS_TABLE}
    WHERE club_id = ? AND is_enabled = TRUE
    ORDER BY display_order ASC, created_at ASC
  `;
  
  const [rows] = await connection.execute(sql, [clubId]);
  
  return rows.map(row => ({
    id: row.id,
    methodCategory: row.method_category,
    providerName: row.provider_name,
    methodLabel: row.method_label,
    displayOrder: row.display_order,
    playerInstructions: row.player_instructions,
    methodConfig: typeof row.method_config === 'string' 
      ? JSON.parse(row.method_config) 
      : row.method_config,
  }));
}

/**
 * Add/update payment method for club
 */
export async function upsertPaymentMethod({
  clubId,
  methodCategory, // 'instant_payment' | 'card' | 'stripe' | 'other'
  providerName = null, // 'revolut' | 'bank_transfer' | 'zippypay' | etc.
  methodLabel, // "Revolut - Main Account"
  playerInstructions = null,
  methodConfig = {},
  isEnabled = true,
  displayOrder = 0,
}) {
  // Check for duplicate label
  const checkSql = `
    SELECT id FROM ${METHODS_TABLE}
    WHERE club_id = ? AND method_label = ?
    LIMIT 1
  `;
  const [existing] = await connection.execute(checkSql, [clubId, methodLabel]);
  
  if (existing.length > 0) {
    // Update existing
    const updateSql = `
      UPDATE ${METHODS_TABLE}
      SET 
        method_category = ?,
        provider_name = ?,
        player_instructions = ?,
        method_config = ?,
        is_enabled = ?,
        display_order = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    const [result] = await connection.execute(updateSql, [
      methodCategory,
      providerName,
      playerInstructions,
      JSON.stringify(methodConfig),
      isEnabled,
      displayOrder,
      existing[0].id,
    ]);
    
    return existing[0].id;
  } else {
    // Insert new
    const insertSql = `
      INSERT INTO ${METHODS_TABLE}
        (club_id, method_category, provider_name, method_label, 
         player_instructions, method_config, is_enabled, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(insertSql, [
      clubId,
      methodCategory,
      providerName,
      methodLabel,
      playerInstructions,
      JSON.stringify(methodConfig),
      isEnabled,
      displayOrder,
    ]);
    
    return result.insertId;
  }
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(clubId, methodId) {
  const sql = `
    DELETE FROM ${METHODS_TABLE}
    WHERE club_id = ? AND id = ?
  `;
  
  const [result] = await connection.execute(sql, [clubId, methodId]);
  return result.affectedRows > 0;
}

/**
 * Get single payment method by ID
 */
export async function getPaymentMethodById(methodId) {
  const sql = `
    SELECT * FROM ${METHODS_TABLE}
    WHERE id = ?
    LIMIT 1
  `;
  
  const [rows] = await connection.execute(sql, [methodId]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    ...row,
    methodConfig: typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config,
  };
}