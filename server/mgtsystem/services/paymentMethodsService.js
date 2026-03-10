// server/mgtsystem/services/paymentMethodsService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

/**
 * Get all payment methods for a club (enabled and disabled)
 * Used for management UI
 */
export async function getAllClubPaymentMethods(clubId) {
  const sql = `
    SELECT 
      id,
      club_id,
      method_category,
      provider_name,
      method_label,
      display_order,
      is_enabled,
      player_instructions,
      method_config,
      added_by,
      edited_by,
      is_official_club_account,
      created_at,
      updated_at
    FROM ${METHODS_TABLE}
    WHERE club_id = ?
    ORDER BY display_order ASC, created_at ASC
  `;
  
  const [rows] = await connection.execute(sql, [clubId]);
  
  return rows.map(row => ({
    id: row.id,
    clubId: row.club_id,
    methodCategory: row.method_category,
    providerName: row.provider_name,
    methodLabel: row.method_label,
    displayOrder: row.display_order,
    isEnabled: Boolean(row.is_enabled),
    playerInstructions: row.player_instructions,
    methodConfig: typeof row.method_config === 'string' 
      ? JSON.parse(row.method_config) 
      : row.method_config,
    addedBy: row.added_by,
    editedBy: row.edited_by,
    isOfficialClubAccount: Boolean(row.is_official_club_account),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get enabled payment methods for a club
 * Used for public-facing player join flow
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
      method_config,
      is_official_club_account
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
    isOfficialClubAccount: Boolean(row.is_official_club_account),
  }));
}

/**
 * Get single payment method by ID
 */
export async function getPaymentMethodById(methodId, clubId) {
  const sql = `
    SELECT * FROM ${METHODS_TABLE}
    WHERE id = ? AND club_id = ?
    LIMIT 1
  `;
  
  const [rows] = await connection.execute(sql, [methodId, clubId]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    clubId: row.club_id,
    methodCategory: row.method_category,
    providerName: row.provider_name,
    methodLabel: row.method_label,
    displayOrder: row.display_order,
    isEnabled: Boolean(row.is_enabled),
    playerInstructions: row.player_instructions,
    methodConfig: typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config,
    addedBy: row.added_by,
    editedBy: row.edited_by,
    isOfficialClubAccount: Boolean(row.is_official_club_account),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create new payment method
 */
export async function createPaymentMethod({
  clubId,
  methodCategory,
  providerName = null,
  methodLabel,
  playerInstructions = null,
  methodConfig = {},
  isEnabled = true,
  displayOrder = 0,
  addedBy = null,
  isOfficialClubAccount = true,
}) {
  // Check for duplicate label
  const checkSql = `
    SELECT id FROM ${METHODS_TABLE}
    WHERE club_id = ? AND method_label = ?
    LIMIT 1
  `;
  const [existing] = await connection.execute(checkSql, [clubId, methodLabel]);
  
  if (existing.length > 0) {
    throw new Error('A payment method with this label already exists');
  }
  
  const insertSql = `
    INSERT INTO ${METHODS_TABLE}
      (club_id, method_category, provider_name, method_label, 
       player_instructions, method_config, is_enabled, display_order,
       added_by, is_official_club_account)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    addedBy,
    isOfficialClubAccount,
  ]);
  
  return result.insertId;
}

/**
 * Update existing payment method
 */
export async function updatePaymentMethod({
  id,
  clubId,
  methodCategory,
  providerName = null,
  methodLabel,
  playerInstructions = null,
  methodConfig = {},
  isEnabled = true,
  displayOrder = 0,
  editedBy = null,
  isOfficialClubAccount = true,
}) {
  // Check if method exists and belongs to this club
  const checkSql = `
    SELECT id FROM ${METHODS_TABLE}
    WHERE id = ? AND club_id = ?
    LIMIT 1
  `;
  const [existing] = await connection.execute(checkSql, [id, clubId]);
  
  if (existing.length === 0) {
    throw new Error('Payment method not found or does not belong to this club');
  }
  
  // Check for duplicate label (excluding current method)
  const duplicateCheckSql = `
    SELECT id FROM ${METHODS_TABLE}
    WHERE club_id = ? AND method_label = ? AND id != ?
    LIMIT 1
  `;
  const [duplicate] = await connection.execute(duplicateCheckSql, [clubId, methodLabel, id]);
  
  if (duplicate.length > 0) {
    throw new Error('A payment method with this label already exists');
  }
  
  const updateSql = `
    UPDATE ${METHODS_TABLE}
    SET 
      method_category = ?,
      provider_name = ?,
      method_label = ?,
      player_instructions = ?,
      method_config = ?,
      is_enabled = ?,
      display_order = ?,
      edited_by = ?,
      is_official_club_account = ?,
      updated_at = NOW()
    WHERE id = ? AND club_id = ?
  `;
  
  const [result] = await connection.execute(updateSql, [
    methodCategory,
    providerName,
    methodLabel,
    playerInstructions,
    JSON.stringify(methodConfig),
    isEnabled,
    displayOrder,
    editedBy,
    isOfficialClubAccount,
    id,
    clubId,
  ]);
  
  return result.affectedRows > 0;
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
 * Bulk update display order
 */
export async function updateDisplayOrders(clubId, orders) {
  // orders is array of { id, displayOrder }
  const promises = orders.map(({ id, displayOrder }) => {
    const sql = `
      UPDATE ${METHODS_TABLE}
      SET display_order = ?, updated_at = NOW()
      WHERE id = ? AND club_id = ?
    `;
    return connection.execute(sql, [displayOrder, id, clubId]);
  });
  
  await Promise.all(promises);
  return true;
}