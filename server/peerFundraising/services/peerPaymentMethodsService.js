import { connection, TABLE_PREFIX } from '../../config/database.js';

const F = `${TABLE_PREFIX}peer_fundraisers`;
const M = `${TABLE_PREFIX}club_payment_methods`;

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
function format(row) {
  return {
    id: Number(row.id),
    methodCategory: row.method_category,
    providerName: row.provider_name ?? null,
    methodLabel: row.method_label,
    displayOrder: Number(row.display_order ?? 0),
    isEnabled: row.is_enabled === 1 || row.is_enabled === true,
    playerInstructions: row.player_instructions ?? null,
    methodConfig: parseJson(row.method_config, null),
    isOfficialClubAccount: row.is_official_club_account === 1 || row.is_official_club_account === true,
  };
}
async function fundraiser(id, clubId = null) {
  const sql = clubId
    ? `SELECT * FROM ${F} WHERE id=? AND club_id=? LIMIT 1`
    : `SELECT * FROM ${F} WHERE id=? LIMIT 1`;
  const [rows] = await connection.execute(sql, clubId ? [id, clubId] : [id]);
  if (!rows[0]) throw Object.assign(new Error('peer_fundraiser_not_found'), { status: 404 });
  return rows[0];
}

// Lists the club's enabled payment methods with no fundraiser context at
// all. Needed so the "create fundraiser" form can offer payment method
// selection during setup - previously every method here required an
// existing fundraiser id, which doesn't exist yet at creation time.
export async function getAvailableMethodsForClub(clubId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${M} WHERE club_id=? AND is_enabled=1 ORDER BY display_order,method_label`,
    [clubId]
  );
  return { availableMethods: rows.map(format) };
}
export async function getManagementMethods(id, clubId) {
  const f = await fundraiser(id, clubId);
  const linked = parseJson(f.linked_payment_methods_json, {});
  const [rows] = await connection.execute(
    `SELECT * FROM ${M} WHERE club_id=? AND is_enabled=1 ORDER BY display_order,method_label`,
    [clubId]
  );
  return {
    availableMethods: rows.map(format),
    linkedMethodIds: Array.isArray(linked.payment_method_ids) ? linked.payment_method_ids.map(Number) : [],
  };
}
export async function updateMethods(id, clubId, ids, updatedBy = null) {
  await fundraiser(id, clubId);
  const methodIds = [...new Set((ids || []).map(Number).filter(Number.isFinite))];
  if (methodIds.length) {
    const ph = methodIds.map(() => '?').join(',');
    const [valid] = await connection.execute(
      `SELECT id FROM ${M} WHERE club_id=? AND is_enabled=1 AND id IN (${ph})`,
      [clubId, ...methodIds]
    );
    if (valid.length !== methodIds.length) {
      throw Object.assign(new Error('invalid_payment_method_ids'), { status: 400 });
    }
  }
  const json = JSON.stringify({ payment_method_ids: methodIds, updated_at: new Date().toISOString(), updated_by: updatedBy });
  await connection.execute(`UPDATE ${F} SET linked_payment_methods_json=? WHERE id=? AND club_id=?`, [json,id,clubId]);
  return { linkedMethodIds: methodIds };
}
export async function getPublicMethods(id) {
  const f = await fundraiser(id);
  const linked = parseJson(f.linked_payment_methods_json, {});
  const ids = Array.isArray(linked.payment_method_ids) ? linked.payment_method_ids.map(Number) : [];
  if (!ids.length) return { paymentMethods: [] };
  const ph = ids.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT * FROM ${M} WHERE club_id=? AND is_enabled=1 AND id IN (${ph}) ORDER BY FIELD(id,${ph})`,
    [f.club_id, ...ids, ...ids]
  );
  return { paymentMethods: rows.map(format) };
}
