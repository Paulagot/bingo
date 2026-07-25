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
async function getRoom({ clubId, roomId }) {
  const [rows] = await connection.execute(`SELECT * FROM ${TABLE} WHERE club_id=? AND room_id=? AND game_type='sponsored_activity' LIMIT 1`, [clubId, roomId]);
  return rows?.[0] || null;
}

export async function createSponsoredActivity({ clubId, roomId, hostId, hostName, sponsorshipOpensAt, sponsorshipClosesAt, timeZone, activityKind, customActivityLabel, suggestedAmounts, currency, onnightMethodIds = [] }) {
  if (!clubId || !roomId || !hostId) throw Object.assign(new Error('missing_required_fields'), { statusCode: 400 });
  const opens = mysqlUtc(sponsorshipOpensAt), closes = mysqlUtc(sponsorshipClosesAt);
  if (!opens || !closes || new Date(sponsorshipClosesAt) <= new Date(sponsorshipOpensAt)) throw Object.assign(new Error('invalid_sponsorship_window'), { statusCode: 400 });
  const amounts = cleanAmounts(suggestedAmounts);
  if (!amounts.length) throw Object.assign(new Error('suggested_amount_required'), { statusCode: 400 });
  if (activityKind === 'other' && !String(customActivityLabel || '').trim()) throw Object.assign(new Error('custom_activity_label_required'), { statusCode: 400 });
  const config = { gameType: 'sponsored_activity', activityKind, customActivityLabel: String(customActivityLabel || '').trim() || null, suggestedAmounts: amounts, allowOtherAmount: true, currency: currency || 'EUR', hostName: hostName || null };
  await connection.execute(`INSERT INTO ${TABLE} (room_id,host_id,club_id,status,game_type,scheduled_at,ended_at,time_zone,config_json,reconciliation_status,created_at,updated_at) VALUES (?,?,?,'scheduled','sponsored_activity',?,?,?,?,'pending',UTC_TIMESTAMP(),UTC_TIMESTAMP())`, [roomId, hostId, clubId, opens, closes, timeZone || null, JSON.stringify(config)]);
  await paymentMethodsService.updateLinkedPaymentMethods({ roomId, clubId, ticketMethodIds: [], onnightMethodIds, userId: hostId });
  return { roomId, room: await getRoom({ clubId, roomId }) };
}

export async function updateSponsoredActivity({ clubId, roomId, sponsorshipOpensAt, sponsorshipClosesAt, timeZone, activityKind, customActivityLabel, suggestedAmounts, currency, onnightMethodIds }) {
  const current = await getRoom({ clubId, roomId });
  if (!current) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (current.status !== 'scheduled') throw Object.assign(new Error('room_not_editable'), { statusCode: 409, currentStatus: current.status });
  const cfg = typeof current.config_json === 'string' ? JSON.parse(current.config_json) : current.config_json;
  const next = { ...cfg };
  if (activityKind !== undefined) next.activityKind = activityKind;
  if (customActivityLabel !== undefined) next.customActivityLabel = String(customActivityLabel || '').trim() || null;
  if (suggestedAmounts !== undefined) { const amounts = cleanAmounts(suggestedAmounts); if (!amounts.length) throw Object.assign(new Error('suggested_amount_required'), { statusCode: 400 }); next.suggestedAmounts = amounts; }
  if (currency !== undefined) next.currency = currency;
  const sets = ['config_json=?', 'updated_at=UTC_TIMESTAMP()']; const params = [JSON.stringify(next)];
  if (sponsorshipOpensAt !== undefined) { sets.unshift('scheduled_at=?'); params.unshift(mysqlUtc(sponsorshipOpensAt)); }
  if (sponsorshipClosesAt !== undefined) { sets.unshift('ended_at=?'); params.unshift(mysqlUtc(sponsorshipClosesAt)); }
  if (timeZone !== undefined) { sets.unshift('time_zone=?'); params.unshift(timeZone || null); }
  params.push(clubId, roomId);
  await connection.execute(`UPDATE ${TABLE} SET ${sets.join(',')} WHERE club_id=? AND room_id=? AND game_type='sponsored_activity' AND status='scheduled' LIMIT 1`, params);
  if (onnightMethodIds !== undefined) {
    await paymentMethodsService.updateLinkedPaymentMethods({ roomId, clubId, ticketMethodIds: [], onnightMethodIds });
    await integrationsService.syncRoomPaymentMethodsToLinkedEvents({ roomId, clubId });
  }
  return { room: await getRoom({ clubId, roomId }) };
}

export { getRoom as getSponsoredActivity };