import { connection, TABLE_PREFIX } from '../../config/database.js';
import { settlementModeFor } from '../../shared/paymentSettlement.js';

const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
const CONTRIBUTIONS_TABLE = `${TABLE_PREFIX}sponsored_contributions`;
const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;
const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function toIso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapContribution(row) {
  return {
    id: String(row.id),
    roomId: row.room_id,
    clubId: row.club_id,
    ledgerId: row.ledger_id == null ? null : String(row.ledger_id),
    supporterId: row.supporter_id ?? null,
    peerFundraiserId: row.peer_fundraiser_id ?? null,
    participantId: row.participant_id ?? null,
    sponsorName: row.sponsor_name ?? null,
    sponsorEmail: row.sponsor_email ?? null,
    displayName: row.display_name ?? null,
    isAnonymous: !!row.is_anonymous,
    message: row.message ?? null,
    amount: Number(row.amount ?? 0),
    currency: row.currency,
    clubPaymentMethodId: String(row.club_payment_method_id),
    paymentMethodCategory: row.payment_method_category_snapshot,
    paymentProvider: row.payment_provider_snapshot ?? null,
    paymentMethodLabel: row.payment_method_label_snapshot ?? null,
    paymentReference: row.payment_reference ?? null,
    status: row.status,
    confirmedAt: toIso(row.confirmed_at),
    confirmedBy: row.confirmed_by ?? null,
    confirmedByName: row.confirmed_by_name ?? null,
    confirmedByRole: row.confirmed_by_role ?? null,
    disputedAt: toIso(row.disputed_at),
    disputedBy: row.disputed_by ?? null,
    disputeReason: row.dispute_reason ?? null,
    externalCheckoutId: row.external_checkout_id ?? null,
    externalTransactionId: row.external_transaction_id ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function normaliseLedgerMethod(category, provider) {
  const c = String(category || '').toLowerCase();
  const p = String(provider || '').toLowerCase();
  if (c === 'stripe') return 'stripe';
  if (c === 'crypto') return 'crypto';
  if (c === 'card') return 'card';
  if (c === 'instant_payment' && p === 'cash') return 'cash';
  if (c === 'instant_payment' && p === 'card_tap') return 'card_tap';
  if (c === 'instant_payment') return 'instant_payment';
  return 'other';
}

async function getOwnedRoom(roomId, clubId, executor = connection) {
  const [rows] = await executor.execute(
    `SELECT room_id, club_id, status, scheduled_at, ended_at, config_json, linked_payment_methods_json
     FROM ${ROOMS_TABLE}
     WHERE room_id = ? AND club_id = ? AND game_type = 'sponsored_activity'
     LIMIT 1`,
    [roomId, clubId],
  );
  return rows?.[0] || null;
}

async function maybeAdvanceLifecycle(room, executor = connection) {
  if (!room) return null;
  const now = Date.now();
  const opens = room.scheduled_at ? new Date(room.scheduled_at).getTime() : null;
  const closes = room.ended_at ? new Date(room.ended_at).getTime() : null;
  let next = room.status;

  if (room.status === 'scheduled' && opens && now >= opens) next = 'open';
  if ((room.status === 'scheduled' || room.status === 'open') && closes && now >= closes) next = 'completed';

  if (next !== room.status) {
    await executor.execute(
      `UPDATE ${ROOMS_TABLE}
       SET status = ?, updated_at = UTC_TIMESTAMP()
       WHERE room_id = ? AND club_id = ? AND game_type = 'sponsored_activity'`,
      [next, room.room_id, room.club_id],
    );
    room.status = next;
  }
  return room;
}

async function getLinkedPaymentMethod({ room, clubId, clubPaymentMethodId, executor = connection }) {
  const linked = parseJson(room.linked_payment_methods_json, {});
  const allowed = new Set((linked.onnight_method_ids || []).map(Number));
  const methodId = Number(clubPaymentMethodId);
  if (!Number.isFinite(methodId) || !allowed.has(methodId)) {
    throw Object.assign(new Error('payment_method_not_linked'), { statusCode: 400 });
  }

  const [rows] = await executor.execute(
    `SELECT id, club_id, method_category, provider_name, method_label,
            method_config, is_enabled
     FROM ${METHODS_TABLE}
     WHERE id = ? AND club_id = ? LIMIT 1`,
    [methodId, clubId],
  );
  const method = rows?.[0];
  if (!method) throw Object.assign(new Error('payment_method_not_found'), { statusCode: 404 });
  if (method.is_enabled !== 1) throw Object.assign(new Error('payment_method_disabled'), { statusCode: 409 });
  return method;
}

export async function getSponsoredActivityOperationalRoom({ roomId, clubId }) {
  const room = await getOwnedRoom(roomId, clubId);
  if (!room) return null;
  return maybeAdvanceLifecycle(room);
}

export async function listSponsoredContributions({ roomId, clubId, status = null, search = '' }) {
  const room = await getSponsoredActivityOperationalRoom({ roomId, clubId });
  if (!room) throw Object.assign(new Error('not_found'), { statusCode: 404 });

  const where = ['room_id = ?', 'club_id = ?'];
  const params = [roomId, clubId];
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  const q = String(search || '').trim();
  if (q) {
    where.push(`(sponsor_name LIKE ? OR sponsor_email LIKE ? OR display_name LIKE ? OR payment_reference LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const [rows] = await connection.execute(
    `SELECT * FROM ${CONTRIBUTIONS_TABLE}
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC, id DESC
     LIMIT 500`,
    params,
  );
  return { roomStatus: room.status, contributions: rows.map(mapContribution) };
}

export async function getSponsoredContributionSummary({ roomId, clubId }) {
  const room = await getSponsoredActivityOperationalRoom({ roomId, clubId });
  if (!room) throw Object.assign(new Error('not_found'), { statusCode: 404 });

  const [[totals]] = await connection.execute(
    `SELECT
       COUNT(*) AS contribution_count,
       SUM(status = 'confirmed') AS confirmed_count,
       COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) AS confirmed_total,
       COALESCE(SUM(CASE WHEN status IN ('pending','claimed') THEN amount ELSE 0 END), 0) AS pending_total,
       COALESCE(SUM(CASE WHEN status = 'disputed' THEN amount ELSE 0 END), 0) AS disputed_total,
       SUM(is_anonymous = 1) AS anonymous_count,
       COUNT(DISTINCT CASE WHEN is_anonymous = 0 THEN COALESCE(NULLIF(sponsor_email,''), NULLIF(display_name,''), NULLIF(sponsor_name,'')) END) AS named_sponsor_count
     FROM ${CONTRIBUTIONS_TABLE}
     WHERE room_id = ? AND club_id = ?`,
    [roomId, clubId],
  );

  const [byMethod] = await connection.execute(
    `SELECT payment_method_label_snapshot AS label,
            payment_method_category_snapshot AS category,
            COUNT(*) AS count,
            COALESCE(SUM(amount), 0) AS total
     FROM ${CONTRIBUTIONS_TABLE}
     WHERE room_id = ? AND club_id = ? AND status = 'confirmed'
     GROUP BY payment_method_label_snapshot, payment_method_category_snapshot
     ORDER BY total DESC`,
    [roomId, clubId],
  );

  const confirmedCount = Number(totals?.confirmed_count ?? 0);
  const confirmedTotal = Number(totals?.confirmed_total ?? 0);
  return {
    roomStatus: room.status,
    summary: {
      contributionCount: Number(totals?.contribution_count ?? 0),
      confirmedCount,
      confirmedTotal,
      pendingTotal: Number(totals?.pending_total ?? 0),
      disputedTotal: Number(totals?.disputed_total ?? 0),
      anonymousCount: Number(totals?.anonymous_count ?? 0),
      namedSponsorCount: Number(totals?.named_sponsor_count ?? 0),
      averageConfirmed: confirmedCount ? confirmedTotal / confirmedCount : 0,
      byMethod: (byMethod || []).map(r => ({
        label: r.label || r.category || 'Payment',
        category: r.category,
        count: Number(r.count ?? 0),
        total: Number(r.total ?? 0),
      })),
    },
  };
}

export async function createManualSponsoredContribution({
  roomId, clubId, sponsorName, sponsorEmail = null, displayName = null,
  isAnonymous = false, message = null, amount, currency = null,
  clubPaymentMethodId, paymentReference = null, createdBy = null,
  peerFundraiserId = null, participantId = null,
}) {
  const poolConnection = await connection.getConnection();
  try {
    await poolConnection.beginTransaction();
    const room = await getOwnedRoom(roomId, clubId, poolConnection);
    if (!room) throw Object.assign(new Error('not_found'), { statusCode: 404 });
    await maybeAdvanceLifecycle(room, poolConnection);
    if (room.status !== 'open') {
      throw Object.assign(new Error('sponsorship_not_open'), { statusCode: 409, currentStatus: room.status });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 10000) {
      throw Object.assign(new Error('invalid_amount'), { statusCode: 400 });
    }
    const method = await getLinkedPaymentMethod({ room, clubId, clubPaymentMethodId, executor: poolConnection });
    if (settlementModeFor(method) !== 'manual') {
      throw Object.assign(new Error('manual_entry_not_allowed_for_auto_settled_method'), { statusCode: 400 });
    }

    const config = parseJson(room.config_json, {});
    const resolvedCurrency = String(currency || config.currency || 'EUR').toUpperCase();
    const resolvedDisplay = isAnonymous
      ? 'Anonymous'
      : String(displayName || sponsorName || '').trim() || 'Sponsor';

    const [insert] = await poolConnection.execute(
      `INSERT INTO ${CONTRIBUTIONS_TABLE}
       (room_id, club_id, peer_fundraiser_id, participant_id,
        sponsor_name, sponsor_email, display_name, is_anonymous, message,
        amount, currency, club_payment_method_id,
        payment_method_category_snapshot, payment_provider_snapshot,
        payment_method_label_snapshot, payment_reference, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claimed')`,
      [roomId, clubId, peerFundraiserId, participantId,
       sponsorName || null, sponsorEmail || null, resolvedDisplay, isAnonymous ? 1 : 0,
       message || null, numericAmount, resolvedCurrency, method.id,
       method.method_category, method.provider_name, method.method_label,
       paymentReference || null],
    );

    const contributionId = String(insert.insertId);
    const playerId = `sponsor_${contributionId}`;
    const ledgerMethod = normaliseLedgerMethod(method.method_category, method.provider_name);
    const [ledgerInsert] = await poolConnection.execute(
      `INSERT INTO ${LEDGER_TABLE}
       (room_id, club_id, player_id, player_name, ledger_type, amount, currency,
        status, payment_method, payment_source, club_payment_method_id,
        payment_reference, claimed_at, claimed_by, extra_id, extra_metadata)
       VALUES (?, ?, ?, ?, 'entry_fee', ?, ?, 'claimed', ?, 'admin_assigned', ?, ?, UTC_TIMESTAMP(), ?, ?, ?)`,
      [roomId, clubId, playerId, resolvedDisplay, numericAmount, resolvedCurrency,
       ledgerMethod, method.id, paymentReference || null, createdBy || clubId,
       contributionId, JSON.stringify({
         activityType: 'sponsored_activity', contributionId,
         isAnonymous: !!isAnonymous, message: message || null,
         peerFundraiserId, participantId,
       })],
    );

    await poolConnection.execute(
      `UPDATE ${CONTRIBUTIONS_TABLE} SET ledger_id = ? WHERE id = ?`,
      [ledgerInsert.insertId, insert.insertId],
    );
    await poolConnection.commit();

    const [[row]] = await connection.execute(`SELECT * FROM ${CONTRIBUTIONS_TABLE} WHERE id = ?`, [insert.insertId]);
    return { contribution: mapContribution(row) };
  } catch (err) {
    await poolConnection.rollback();
    throw err;
  } finally {
    poolConnection.release();
  }
}

export async function confirmSponsoredContribution({ roomId, clubId, contributionId, confirmer }) {
  const poolConnection = await connection.getConnection();
  try {
    await poolConnection.beginTransaction();
    const [[row]] = await poolConnection.execute(
      `SELECT c.*, pm.method_config
       FROM ${CONTRIBUTIONS_TABLE} c
       JOIN ${METHODS_TABLE} pm ON pm.id = c.club_payment_method_id
       WHERE c.id = ? AND c.room_id = ? AND c.club_id = ?
       LIMIT 1 FOR UPDATE`,
      [contributionId, roomId, clubId],
    );
    if (!row) throw Object.assign(new Error('contribution_not_found'), { statusCode: 404 });
    if (!['claimed', 'disputed'].includes(row.status)) {
      throw Object.assign(new Error('contribution_not_confirmable'), { statusCode: 409 });
    }
    if (settlementModeFor({ method_category: row.payment_method_category_snapshot, method_config: row.method_config }) !== 'manual') {
      throw Object.assign(new Error('auto_settled_payment_cannot_be_manually_confirmed'), { statusCode: 409 });
    }

    const id = confirmer?.id || clubId;
    const name = confirmer?.name || 'Admin';
    const role = ['host', 'admin', 'system'].includes(confirmer?.role) ? confirmer.role : 'admin';

    await poolConnection.execute(
      `UPDATE ${CONTRIBUTIONS_TABLE}
       SET status = 'confirmed', confirmed_at = UTC_TIMESTAMP(), confirmed_by = ?,
           confirmed_by_name = ?, confirmed_by_role = ?, disputed_at = NULL,
           disputed_by = NULL, dispute_reason = NULL, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [id, name, role, contributionId],
    );
    await poolConnection.execute(
      `UPDATE ${LEDGER_TABLE}
       SET status = 'confirmed', confirmed_at = UTC_TIMESTAMP(), confirmed_by = ?,
           confirmed_by_name = ?, confirmed_by_role = ?, admin_notes = NULL,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ? AND room_id = ?`,
      [id, name, role, row.ledger_id, roomId],
    );
    await poolConnection.commit();
    return { ok: true };
  } catch (err) {
    await poolConnection.rollback();
    throw err;
  } finally {
    poolConnection.release();
  }
}

export async function disputeSponsoredContribution({ roomId, clubId, contributionId, disputeReason, disputedBy }) {
  const reason = String(disputeReason || '').trim();
  if (!reason) throw Object.assign(new Error('dispute_reason_required'), { statusCode: 400 });
  const poolConnection = await connection.getConnection();
  try {
    await poolConnection.beginTransaction();
    const [[row]] = await poolConnection.execute(
      `SELECT * FROM ${CONTRIBUTIONS_TABLE}
       WHERE id = ? AND room_id = ? AND club_id = ? LIMIT 1 FOR UPDATE`,
      [contributionId, roomId, clubId],
    );
    if (!row) throw Object.assign(new Error('contribution_not_found'), { statusCode: 404 });
    if (row.status !== 'claimed') throw Object.assign(new Error('only_claimed_contributions_can_be_disputed'), { statusCode: 409 });

    const id = disputedBy?.id || clubId;
    await poolConnection.execute(
      `UPDATE ${CONTRIBUTIONS_TABLE}
       SET status = 'disputed', disputed_at = UTC_TIMESTAMP(), disputed_by = ?,
           dispute_reason = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [id, reason, contributionId],
    );
    await poolConnection.execute(
      `UPDATE ${LEDGER_TABLE}
       SET status = 'disputed', admin_notes = ?, confirmed_by = ?,
           confirmed_by_name = ?, confirmed_by_role = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ? AND room_id = ?`,
      [reason, id, disputedBy?.name || 'Admin', disputedBy?.role || 'admin', row.ledger_id, roomId],
    );
    await poolConnection.commit();
    return { ok: true };
  } catch (err) {
    await poolConnection.rollback();
    throw err;
  } finally {
    poolConnection.release();
  }
}

export async function openSponsoredActivityNow({ roomId, clubId }) {
  const room = await getOwnedRoom(roomId, clubId);
  if (!room) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (room.status !== 'scheduled') throw Object.assign(new Error('activity_not_scheduled'), { statusCode: 409 });
  await connection.execute(
    `UPDATE ${ROOMS_TABLE} SET status = 'open', scheduled_at = LEAST(COALESCE(scheduled_at, UTC_TIMESTAMP()), UTC_TIMESTAMP()), updated_at = UTC_TIMESTAMP()
     WHERE room_id = ? AND club_id = ? AND game_type = 'sponsored_activity'`,
    [roomId, clubId],
  );
  return { ok: true, status: 'open' };
}

export async function closeSponsoredActivity({ roomId, clubId }) {
  const room = await getOwnedRoom(roomId, clubId);
  if (!room) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (!['scheduled', 'open'].includes(room.status)) throw Object.assign(new Error('activity_not_closable'), { statusCode: 409 });
  await connection.execute(
    `UPDATE ${ROOMS_TABLE}
     SET status = 'completed', ended_at = LEAST(COALESCE(ended_at, UTC_TIMESTAMP()), UTC_TIMESTAMP()), updated_at = UTC_TIMESTAMP()
     WHERE room_id = ? AND club_id = ? AND game_type = 'sponsored_activity'`,
    [roomId, clubId],
  );
  return { ok: true, status: 'completed' };
}
