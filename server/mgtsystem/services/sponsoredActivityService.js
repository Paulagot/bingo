import { connection, TABLE_PREFIX } from '../../config/database.js';
import QuizPaymentMethodsService from './QuizPaymentMethodsService.js';
import EventIntegrationsService from './EventIntegrationsService.js';

const TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
const paymentMethodsService = new QuizPaymentMethodsService();
const integrationsService = new EventIntegrationsService();

function mysqlUtc(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function cleanAmounts(values) {
  return [...new Set((values || []).map(Number).filter(n => Number.isFinite(n) && n > 0))].slice(0, 5);
}
function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
async function advanceStatus(row) {
  if (!row) return null;
  const now = Date.now();
  const opens = row.scheduled_at ? new Date(row.scheduled_at).getTime() : null;
  const closes = row.ended_at ? new Date(row.ended_at).getTime() : null;
  let next = row.status;
  if (row.status === 'scheduled' && opens && now >= opens) next = 'open';
  if ((row.status === 'scheduled' || row.status === 'open') && closes && now >= closes) next = 'completed';
  if (next !== row.status) {
    await connection.execute(
      `UPDATE ${TABLE} SET status=?, updated_at=UTC_TIMESTAMP()
       WHERE club_id=? AND room_id=? AND game_type='sponsored_activity'`,
      [next, row.club_id, row.room_id],
    );
    row.status = next;
  }
  row.config_json = parseJson(row.config_json, {});
  row.linked_payment_methods_json = parseJson(row.linked_payment_methods_json, {});
  return row;
}
async function getRoom({ clubId, roomId }) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${TABLE}
     WHERE club_id=? AND room_id=? AND game_type='sponsored_activity' LIMIT 1`,
    [clubId, roomId],
  );
  return advanceStatus(rows?.[0] || null);
}

export async function createSponsoredActivity({ clubId, roomId, hostId, hostName, sponsorshipOpensAt, sponsorshipClosesAt, timeZone, activityKind, customActivityLabel, suggestedAmounts, currency, onnightMethodIds = [] }) {
  if (!clubId || !roomId || !hostId) throw Object.assign(new Error('missing_required_fields'), { statusCode: 400 });
  const opens = mysqlUtc(sponsorshipOpensAt), closes = mysqlUtc(sponsorshipClosesAt);
  if (!opens || !closes || new Date(sponsorshipClosesAt) <= new Date(sponsorshipOpensAt)) throw Object.assign(new Error('invalid_sponsorship_window'), { statusCode: 400 });
  const amounts = cleanAmounts(suggestedAmounts);
  if (!amounts.length) throw Object.assign(new Error('suggested_amount_required'), { statusCode: 400 });
  if (activityKind === 'other' && !String(customActivityLabel || '').trim()) throw Object.assign(new Error('custom_activity_label_required'), { statusCode: 400 });
  const config = { gameType: 'sponsored_activity', activityKind, customActivityLabel: String(customActivityLabel || '').trim() || null, suggestedAmounts: amounts, allowOtherAmount: true, currency: currency || 'EUR', hostName: hostName || null };
  await connection.execute(
    `INSERT INTO ${TABLE}
     (room_id,host_id,club_id,status,game_type,scheduled_at,ended_at,time_zone,config_json,reconciliation_status,created_at,updated_at)
     VALUES (?,?,?,'scheduled','sponsored_activity',?,?,?,?,'pending',UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [roomId, hostId, clubId, opens, closes, timeZone || null, JSON.stringify(config)],
  );
  try {
    await paymentMethodsService.updateLinkedPaymentMethods({ roomId, clubId, ticketMethodIds: [], onnightMethodIds, userId: hostId });
    await integrationsService.syncRoomPaymentMethodsToLinkedEvents({ roomId, clubId });
  } catch (err) {
    console.warn('[SponsoredActivity] payment method link failed:', err?.message || err);
  }
  return { roomId, room: await getRoom({ clubId, roomId }) };
}

export async function updateSponsoredActivity({ clubId, roomId, sponsorshipOpensAt, sponsorshipClosesAt, timeZone, activityKind, customActivityLabel, suggestedAmounts, currency, onnightMethodIds }) {
  const current = await getRoom({ clubId, roomId });
  if (!current) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (current.status !== 'scheduled') throw Object.assign(new Error('room_not_editable'), { statusCode: 409, currentStatus: current.status });

  const currentOpens = current.scheduled_at;
  const currentCloses = current.ended_at;
  const nextOpensRaw = sponsorshipOpensAt !== undefined ? sponsorshipOpensAt : currentOpens;
  const nextClosesRaw = sponsorshipClosesAt !== undefined ? sponsorshipClosesAt : currentCloses;
  const nextOpens = mysqlUtc(nextOpensRaw);
  const nextCloses = mysqlUtc(nextClosesRaw);
  if (!nextOpens || !nextCloses || new Date(nextClosesRaw) <= new Date(nextOpensRaw)) {
    throw Object.assign(new Error('invalid_sponsorship_window'), { statusCode: 400 });
  }

  const cfg = parseJson(current.config_json, {});
  const next = { ...cfg };
  if (activityKind !== undefined) next.activityKind = activityKind;
  if (customActivityLabel !== undefined) next.customActivityLabel = String(customActivityLabel || '').trim() || null;
  if (suggestedAmounts !== undefined) {
    const amounts = cleanAmounts(suggestedAmounts);
    if (!amounts.length) throw Object.assign(new Error('suggested_amount_required'), { statusCode: 400 });
    next.suggestedAmounts = amounts;
  }
  if (currency !== undefined) next.currency = currency;
  if (next.activityKind === 'other' && !String(next.customActivityLabel || '').trim()) {
    throw Object.assign(new Error('custom_activity_label_required'), { statusCode: 400 });
  }

  await connection.execute(
    `UPDATE ${TABLE}
     SET config_json=?, scheduled_at=?, ended_at=?, time_zone=?, updated_at=UTC_TIMESTAMP()
     WHERE club_id=? AND room_id=? AND game_type='sponsored_activity' AND status='scheduled' LIMIT 1`,
    [JSON.stringify(next), nextOpens, nextCloses, timeZone !== undefined ? (timeZone || null) : current.time_zone, clubId, roomId],
  );
  if (onnightMethodIds !== undefined) {
    await paymentMethodsService.updateLinkedPaymentMethods({ roomId, clubId, ticketMethodIds: [], onnightMethodIds });
    await integrationsService.syncRoomPaymentMethodsToLinkedEvents({ roomId, clubId });
  }
  return { room: await getRoom({ clubId, roomId }) };
}

export { getRoom as getSponsoredActivity };
