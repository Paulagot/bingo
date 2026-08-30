// peerCoreShared.js
// Extracted from peerCoreService.js by split_peer_core.mjs - behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

export const F = `${TABLE_PREFIX}peer_fundraisers`;
export const P = `${TABLE_PREFIX}peer_participants`;
export const PK = `${TABLE_PREFIX}peer_packs`;
export const PI = `${TABLE_PREFIX}peer_pack_items`;
export const O = `${TABLE_PREFIX}peer_orders`;
export const OI = `${TABLE_PREFIX}peer_order_items`;
export const R = `${TABLE_PREFIX}web2_quiz_rooms`;
export const C = `${TABLE_PREFIX}clubs`;
export const DROP_TIERS = `${TABLE_PREFIX}puzzle_drop_pricing_tiers`;
export const DROP_ITEMS = `${TABLE_PREFIX}puzzle_drop_items`;

export const id = () => nanoid(21);
export const parseJson = (v, f={}) => {
  if (!v) return f;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return f; }
};
export const slugify = v => String(v || '').toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-')
  .replace(/^-|-$/g,'').slice(0,120);
export const fail = (message, status=400) => { throw Object.assign(new Error(message), { status }); };

// Currently the public support page hardcodes 'cash_to_participant', so a
// bare passthrough of b.paymentMethodCategory has been harmless so far -
// but the moment real payment method choice is added to the public page,
// unvalidated client input goes straight into an ENUM column. Mirrors
// campaign's normalisePaymentCategory.
export async function assertFundraiser(fid, clubId) {
  const [rows] = await connection.execute(`SELECT * FROM ${F} WHERE id=? AND club_id=? LIMIT 1`, [fid, clubId]);
  if (!rows[0]) fail('peer_fundraiser_not_found',404);
  return rows[0];
}
export async function uniqueSlug(table, parentCol, parentId, slugCol, raw, excludeId=null) {
  const base = slugify(raw) || `item-${Date.now()}`;
  for (let n=1;n<100;n++) {
    const candidate = n===1 ? base : `${base}-${n}`;
    const sql = `SELECT id FROM ${table} WHERE ${parentCol}=? AND ${slugCol}=? ${excludeId?'AND id<>?':''} LIMIT 1`;
    const [rows] = await connection.execute(sql, excludeId?[parentId,candidate,excludeId]:[parentId,candidate]);
    if (!rows[0]) return candidate;
  }
  return `${base}-${Date.now()}`;
}
