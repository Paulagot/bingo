//server/mgtsystem/services/sponsoredActivityPublicService.js
import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { verifySolanaTransfer, normalizeNetwork, normalizeWallet, parseJsonMaybe } from '../../quiz/services/cryptoSolanaPaymentVerificationService.js';
import { toFiat } from './Tokenpriceservice.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;
const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;
const CONTRIBUTIONS_TABLE = `${TABLE_PREFIX}sponsored_contributions`;
const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;
const PEER_FUNDRAISERS_TABLE = `${TABLE_PREFIX}peer_fundraisers`;
const PEER_PARTICIPANTS_TABLE = `${TABLE_PREFIX}peer_participants`;

const ALLOWED_APP_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'https://fundraisely.ie',
  'https://www.fundraisely.ie',
  'https://fundraisely.co.uk',
  'https://www.fundraisely.co.uk',
  'https://fundraisely-staging.up.railway.app',
  'http://fundraisely-staging.up.railway.app',
]);

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function asStatusError(message, statusCode = 400, extra = {}) {
  return Object.assign(new Error(message), { statusCode, ...extra });
}

function mysqlDateToIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function publicStatus(row) {
  const now = Date.now();
  const opens = row.scheduled_at ? new Date(row.scheduled_at).getTime() : null;
  const closes = row.ended_at ? new Date(row.ended_at).getTime() : null;
  if (row.status === 'completed' || (closes && now >= closes)) return 'completed';
  if (row.status === 'open' || (opens && now >= opens)) return 'open';
  return 'scheduled';
}

async function maybeAdvancePublicLifecycle(row, executor = connection) {
  const next = publicStatus(row);
  if (next !== row.status) {
    await executor.execute(
      `UPDATE ${ROOMS_TABLE}
       SET status = ?, updated_at = UTC_TIMESTAMP()
       WHERE room_id = ? AND club_id = ? AND game_type = 'sponsored_activity'`,
      [next, row.room_id, row.club_id],
    );
    row.status = next;
  }
  return row;
}

async function getRoom(roomId, executor = connection, lock = false) {
  const [rows] = await executor.execute(
    `SELECT room_id, club_id, status, scheduled_at, ended_at, time_zone,
            config_json, linked_payment_methods_json
     FROM ${ROOMS_TABLE}
     WHERE room_id = ? AND game_type = 'sponsored_activity'
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [roomId],
  );
  const row = rows?.[0] || null;
  return row ? maybeAdvancePublicLifecycle(row, executor) : null;
}

async function getLinkedMethods(room, executor = connection) {
  const linked = parseJson(room.linked_payment_methods_json, {});
  const ids = (linked.onnight_method_ids || []).map(Number).filter(Number.isFinite);
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await executor.execute(
    `SELECT id, club_id, method_category, provider_name, method_label,
            player_instructions, method_config, is_enabled
     FROM ${METHODS_TABLE}
     WHERE club_id = ? AND is_enabled = 1 AND id IN (${placeholders})`,
    [room.club_id, ...ids],
  );
  const order = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((a, b) => (order.get(Number(a.id)) ?? 999) - (order.get(Number(b.id)) ?? 999));
}

function mapMethod(row) {
  const cfg = parseJson(row.method_config, {});
  return {
    id: String(row.id),
    methodLabel: row.method_label,
    methodCategory: row.method_category,
    providerName: row.provider_name ?? null,
    playerInstructions: row.player_instructions ?? null,
    methodConfig: cfg,
    displayOrder: 0,
    isEnabled: row.is_enabled === 1,
  };
}

export async function getPublicSponsoredActivity(roomId) {
  const room = await getRoom(roomId);
  if (!room) return null;
  const config = parseJson(room.config_json, {});
  const [clubRows] = await connection.execute(
    `SELECT name, brand_logo_url, brand_primary_color,
            brand_background_color, brand_text_on_primary_color
     FROM ${CLUBS_TABLE}
     WHERE id = ? LIMIT 1`,
    [room.club_id],
  );
  const club = clubRows?.[0] || {};
  const methods = await getLinkedMethods(room);

  const activityLabel = config.activityKind === 'other'
    ? (config.customActivityLabel || 'Sponsored activity')
    : ({ walk: 'Sponsored walk', run: 'Sponsored run', cycle: 'Sponsored cycle', swim: 'Sponsored swim', readathon: 'Readathon', silence: 'Sponsored silence' }[config.activityKind] || 'Sponsored activity');

  return {
    roomId: room.room_id,
    clubId: room.club_id,
    status: room.status,
    opensAt: mysqlDateToIso(room.scheduled_at),
    closesAt: mysqlDateToIso(room.ended_at),
    timeZone: room.time_zone ?? null,
    activityKind: config.activityKind ?? 'other',
    activityLabel,
    customActivityLabel: config.customActivityLabel ?? null,
    hostName: config.hostName ?? null,
    suggestedAmounts: Array.isArray(config.suggestedAmounts) ? config.suggestedAmounts.map(Number).filter(n => n > 0) : [],
    allowOtherAmount: config.allowOtherAmount !== false,
    currency: String(config.currency || 'EUR').toUpperCase(),
    clubName: club.name ?? null,
    clubLogoUrl: club.brand_logo_url ?? null,
    clubPrimaryColor: club.brand_primary_color ?? null,
    clubBackgroundColor: club.brand_background_color ?? null,
    clubTextOnPrimaryColor: club.brand_text_on_primary_color ?? null,
    paymentMethods: methods.map(mapMethod),
  };
}

async function validatePublicContributionInput({ room, clubPaymentMethodId, amount, sponsorName, sponsorEmail }, executor) {
  if (room.status !== 'open') {
    throw asStatusError('sponsorship_not_open', 409, { currentStatus: room.status });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 10000) {
    throw asStatusError('invalid_amount', 400);
  }
  if (!String(sponsorName || '').trim()) throw asStatusError('sponsor_name_required', 400);
  if (sponsorEmail && !/^\S+@\S+\.\S+$/.test(String(sponsorEmail).trim())) {
    throw asStatusError('invalid_sponsor_email', 400);
  }
  const methods = await getLinkedMethods(room, executor);
  const method = methods.find(m => String(m.id) === String(clubPaymentMethodId));
  if (!method) throw asStatusError('payment_method_not_available', 409);
  return { numericAmount, method };
}


async function validatePeerAttribution({
  room,
  peerFundraiserId = null,
  participantId = null,
  executor = connection,
}) {
  const fundraiserId = String(peerFundraiserId || '').trim() || null;
  const resolvedParticipantId = String(participantId || '').trim() || null;

  if (!fundraiserId && !resolvedParticipantId) {
    return {
      peerFundraiserId: null,
      participantId: null,
    };
  }

  if (!fundraiserId && resolvedParticipantId) {
    throw asStatusError('peer_fundraiser_required_for_participant', 400);
  }

  const [fundraiserRows] = await executor.execute(
    `SELECT id, club_id, format_type, settings_json
     FROM ${PEER_FUNDRAISERS_TABLE}
     WHERE id = ?
       AND club_id = ?
       AND format_type = 'sponsored'
       AND status = 'published'
     LIMIT 1`,
    [fundraiserId, room.club_id],
  );

  const fundraiser = fundraiserRows?.[0];
  if (!fundraiser) {
    throw asStatusError('peer_fundraiser_not_available', 409);
  }

  const settings = parseJson(fundraiser.settings_json, {});
  if (String(settings.sponsoredRoomId || '') !== String(room.room_id)) {
    throw asStatusError('peer_fundraiser_room_mismatch', 409);
  }

  if (resolvedParticipantId) {
    const [participantRows] = await executor.execute(
      `SELECT id
       FROM ${PEER_PARTICIPANTS_TABLE}
       WHERE id = ?
         AND peer_fundraiser_id = ?
         AND club_id = ?
         AND is_active = 1
       LIMIT 1`,
      [resolvedParticipantId, fundraiserId, room.club_id],
    );

    if (!participantRows?.[0]) {
      throw asStatusError('peer_participant_not_available', 409);
    }
  }

  return {
    peerFundraiserId: fundraiserId,
    participantId: resolvedParticipantId,
  };
}

async function insertContributionAndLedger({
  executor, room, method, amount, sponsorName, sponsorEmail, displayName,
  isAnonymous, message, paymentReference, contributionStatus, ledgerStatus,
  paymentSource,
  peerFundraiserId = null,
  participantId = null,
}) {
  const config = parseJson(room.config_json, {});
  const currency = String(config.currency || 'EUR').toUpperCase();
  const resolvedDisplay = isAnonymous
    ? 'Anonymous'
    : (String(displayName || sponsorName || '').trim() || 'Sponsor');

  const [contributionInsert] = await executor.execute(
    `INSERT INTO ${CONTRIBUTIONS_TABLE}
     (room_id, club_id, peer_fundraiser_id, participant_id,
      sponsor_name, sponsor_email, display_name,
      is_anonymous, message, amount, currency, club_payment_method_id,
      payment_method_category_snapshot, payment_provider_snapshot,
      payment_method_label_snapshot, payment_reference, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [room.room_id, room.club_id, peerFundraiserId, participantId,
     String(sponsorName).trim(), sponsorEmail ? String(sponsorEmail).trim() : null,
     resolvedDisplay, isAnonymous ? 1 : 0, message ? String(message).trim().slice(0, 500) : null,
     amount, currency, method.id, method.method_category, method.provider_name,
     method.method_label, paymentReference || null, contributionStatus],
  );

  const contributionId = String(contributionInsert.insertId);
  const playerId = `sponsor_${contributionId}`;
  const [ledgerInsert] = await executor.execute(
    `INSERT INTO ${LEDGER_TABLE}
     (room_id, club_id, player_id, player_name, ledger_type, amount, currency,
      status, payment_method, payment_source, club_payment_method_id,
      payment_reference, extra_id, extra_metadata, claimed_at, claimed_by)
     VALUES (?, ?, ?, ?, 'entry_fee', ?, ?, ?, ?, ?, ?, ?, ?, ?,
             CASE WHEN ? = 'claimed' THEN UTC_TIMESTAMP() ELSE NULL END,
             CASE WHEN ? = 'claimed' THEN ? ELSE NULL END)`,
    [room.room_id, room.club_id, playerId, resolvedDisplay, amount, currency,
     ledgerStatus, normaliseLedgerMethod(method.method_category, method.provider_name),
     paymentSource, method.id, paymentReference || null, contributionId,
     JSON.stringify({
       activityType: 'sponsored_activity',
       contributionId,
       isAnonymous: !!isAnonymous,
       message: message || null,
       peerFundraiserId,
       participantId,
     }),
     ledgerStatus, ledgerStatus, playerId],
  );

  await executor.execute(
    `UPDATE ${CONTRIBUTIONS_TABLE} SET ledger_id = ? WHERE id = ?`,
    [ledgerInsert.insertId, contributionInsert.insertId],
  );

  return { contributionId, ledgerId: String(ledgerInsert.insertId), currency, displayName: resolvedDisplay };
}

export async function createPublicManualContribution(payload) {
  const tx = await connection.getConnection();
  try {
    await tx.beginTransaction();
    const room = await getRoom(payload.roomId, tx, true);
    if (!room) throw asStatusError('not_found', 404);
    const { numericAmount, method } = await validatePublicContributionInput({ ...payload, room }, tx);
    const attribution = await validatePeerAttribution({
      room,
      peerFundraiserId: payload.peerFundraiserId,
      participantId: payload.peerParticipantId || payload.participantId,
      executor: tx,
    });
    const category = String(method.method_category || '').toLowerCase();
    if (!['instant_payment', 'other', 'card'].includes(category)) {
      throw asStatusError('manual_claim_not_allowed_for_method', 400);
    }
    const result = await insertContributionAndLedger({
      executor: tx, room, method, amount: numericAmount,
      sponsorName: payload.sponsorName, sponsorEmail: payload.sponsorEmail,
      displayName: payload.displayName, isAnonymous: payload.isAnonymous,
      message: payload.message, paymentReference: payload.paymentReference,
      contributionStatus: 'claimed', ledgerStatus: 'claimed', paymentSource: 'player_claimed',
      ...attribution,
    });
    await tx.commit();
    return { ok: true, status: 'claimed', ...result };
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.release();
  }
}

function validateOrigin(appOrigin) {
  const origin = String(appOrigin || '').trim().replace(/\/+$/, '');
  if (!ALLOWED_APP_ORIGINS.has(origin)) throw asStatusError('invalid_app_origin', 400);
  return origin;
}

export async function createSponsoredStripeCheckout(payload) {
  const tx = await connection.getConnection();
  let created;
  try {
    await tx.beginTransaction();
    const room = await getRoom(payload.roomId, tx, true);
    if (!room) throw asStatusError('not_found', 404);
    const { numericAmount, method } = await validatePublicContributionInput({ ...payload, room }, tx);
    const attribution = await validatePeerAttribution({
      room,
      peerFundraiserId: payload.peerFundraiserId,
      participantId: payload.peerParticipantId || payload.participantId,
      executor: tx,
    });
    if (String(method.method_category).toLowerCase() !== 'stripe') {
      throw asStatusError('stripe_method_required', 400);
    }
    const cfg = parseJson(method.method_config, {});
    const accountId = cfg?.connect?.accountId;
    if (!accountId || !cfg?.connect?.chargesEnabled) {
      throw asStatusError('stripe_not_ready', 422);
    }
    created = await insertContributionAndLedger({
      executor: tx, room, method, amount: numericAmount,
      sponsorName: payload.sponsorName, sponsorEmail: payload.sponsorEmail,
      displayName: payload.displayName, isAnonymous: payload.isAnonymous,
      message: payload.message, paymentReference: null,
      contributionStatus: 'pending', ledgerStatus: 'expected', paymentSource: 'webhook_auto',
      ...attribution,
    });
    await tx.commit();

    const origin = validateOrigin(payload.appOrigin);
    const requestedPath = String(payload.returnPath || '').trim();
    const returnPath = (
      requestedPath.startsWith('/sponsor/') ||
  requestedPath.startsWith('/peer-support/') ||
  requestedPath.startsWith('/fundraise/') 
    )
      ? requestedPath
      : `/sponsor/${payload.roomId}`;

    const returnQuery = new URLSearchParams();
    if (attribution.peerFundraiserId) {
      returnQuery.set('peerFundraiserId', attribution.peerFundraiserId);
    }
    if (attribution.participantId) {
      returnQuery.set('peerParticipantId', attribution.participantId);
    }
    const queryPrefix = returnQuery.toString()
      ? `${returnQuery.toString()}&`
      : '';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: payload.sponsorEmail || undefined,
      line_items: [{
        price_data: {
          currency: created.currency.toLowerCase(),
          product_data: { name: `Sponsorship - ${payload.activityLabel || 'Sponsored activity'}` },
          unit_amount: Math.round(numericAmount * 100),
        },
        quantity: 1,
      }],
      success_url: `${origin}${returnPath}?${queryPrefix}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?${queryPrefix}cancelled=1`,
      metadata: {
        type: 'sponsored_activity_contribution',
        contributionId: created.contributionId,
        roomId: payload.roomId,
        clubId: room.club_id,
        peerFundraiserId: attribution.peerFundraiserId || '',
        peerParticipantId: attribution.participantId || '',
      },
    }, { stripeAccount: accountId });

    await connection.execute(
      `UPDATE ${CONTRIBUTIONS_TABLE}
       SET external_checkout_id = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ? AND status = 'pending'`,
      [session.id, created.contributionId],
    );
    await connection.execute(
      `UPDATE ${LEDGER_TABLE}
       SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [session.id, created.ledgerId],
    );

    return { ok: true, contributionId: created.contributionId, redirectUrl: session.url };
  } catch (error) {
    if (tx.connection) {
      try { await tx.rollback(); } catch {}
    }
    if (created?.contributionId) {
      await connection.execute(
        `UPDATE ${CONTRIBUTIONS_TABLE} SET status = 'failed', updated_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'`,
        [created.contributionId],
      ).catch(() => {});
      await connection.execute(
        `UPDATE ${LEDGER_TABLE} SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'expected'`,
        [created.ledgerId],
      ).catch(() => {});
    }
    throw error;
  } finally {
    tx.release();
  }
}

export async function createSponsoredCryptoContribution(payload) {
  const tx = await connection.getConnection();
  try {
    await tx.beginTransaction();
    const room = await getRoom(payload.roomId, tx, true);
    if (!room) throw asStatusError('not_found', 404);
    const { numericAmount, method } = await validatePublicContributionInput({ ...payload, room }, tx);
    const attribution = await validatePeerAttribution({
      room,
      peerFundraiserId: payload.peerFundraiserId,
      participantId: payload.peerParticipantId || payload.participantId,
      executor: tx,
    });
    if (String(method.method_category).toLowerCase() !== 'crypto') {
      throw asStatusError('crypto_method_required', 400);
    }
    const cfg = parseJson(method.method_config, {});
    const walletAddress = cfg?.walletAddress;
    if (!walletAddress) throw asStatusError('crypto_wallet_not_configured', 422);
    const result = await insertContributionAndLedger({
      executor: tx, room, method, amount: numericAmount,
      sponsorName: payload.sponsorName, sponsorEmail: payload.sponsorEmail,
      displayName: payload.displayName, isAnonymous: payload.isAnonymous,
      message: payload.message, paymentReference: null,
      contributionStatus: 'pending', ledgerStatus: 'expected', paymentSource: 'player_selected',
      ...attribution,
    });
    await tx.commit();
    return { ok: true, status: 'pending', walletAddress, ...result };
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.release();
  }
}

export async function confirmSponsoredContributionAutomatic({
  contributionId = null, externalCheckoutId = null, externalTransactionId = null,
  confirmedByName = 'Payment provider', crypto = null,
}) {
  if (!contributionId && !externalCheckoutId) throw asStatusError('contribution_identifier_required', 400);
  const tx = await connection.getConnection();
  try {
    await tx.beginTransaction();
    const where = contributionId ? 'c.id = ?' : 'c.external_checkout_id = ?';
    const key = contributionId || externalCheckoutId;
    const [[row]] = await tx.execute(
      `SELECT c.* FROM ${CONTRIBUTIONS_TABLE} c WHERE ${where} LIMIT 1 FOR UPDATE`,
      [key],
    );
    if (!row) throw asStatusError('contribution_not_found', 404);
    if (row.status === 'confirmed') {
      await tx.commit();
      return { ok: true, contributionId: String(row.id), alreadyConfirmed: true };
    }
    if (row.status !== 'pending') throw asStatusError(`contribution_is_${row.status}`, 409);

    await tx.execute(
      `UPDATE ${CONTRIBUTIONS_TABLE}
       SET status = 'confirmed', confirmed_at = UTC_TIMESTAMP(), confirmed_by = 'webhook_auto',
           confirmed_by_name = ?, confirmed_by_role = 'system',
           external_transaction_id = COALESCE(?, external_transaction_id),
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [confirmedByName, externalTransactionId, row.id],
    );
    await tx.execute(
      `UPDATE ${LEDGER_TABLE}
       SET status = 'confirmed', confirmed_at = UTC_TIMESTAMP(), confirmed_by = 'webhook_auto',
           confirmed_by_name = ?, confirmed_by_role = 'system', payment_source = 'webhook_auto',
           external_transaction_id = COALESCE(?, external_transaction_id),
           extra_metadata = JSON_SET(COALESCE(extra_metadata, '{}'), '$.crypto', CAST(? AS JSON)),
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [confirmedByName, externalTransactionId, JSON.stringify(crypto || null), row.ledger_id],
    );
    await tx.commit();
    return { ok: true, contributionId: String(row.id), roomId: row.room_id, clubId: row.club_id };
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.release();
  }
}

export async function expireSponsoredStripeContribution({ externalCheckoutId }) {
  const tx = await connection.getConnection();
  try {
    await tx.beginTransaction();
    const [[row]] = await tx.execute(
      `SELECT id, ledger_id FROM ${CONTRIBUTIONS_TABLE}
       WHERE external_checkout_id = ? LIMIT 1 FOR UPDATE`,
      [externalCheckoutId],
    );
    if (!row) {
      await tx.commit();
      return false;
    }
    await tx.execute(
      `UPDATE ${CONTRIBUTIONS_TABLE} SET status = 'expired', updated_at = UTC_TIMESTAMP()
       WHERE id = ? AND status = 'pending'`,
      [row.id],
    );
    await tx.execute(
      `UPDATE ${LEDGER_TABLE} SET status = 'cancelled', updated_at = UTC_TIMESTAMP()
       WHERE id = ? AND status = 'expected'`,
      [row.ledger_id],
    );
    await tx.commit();
    return true;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.release();
  }
}

export async function getPublicContributionStatus({ roomId, contributionId = null, externalCheckoutId = null }) {
  const where = contributionId ? 'id = ?' : 'external_checkout_id = ?';
  const key = contributionId || externalCheckoutId;
  const [rows] = await connection.execute(
    `SELECT id, room_id, status, amount, currency, display_name, is_anonymous
     FROM ${CONTRIBUTIONS_TABLE}
     WHERE ${where} AND room_id = ? LIMIT 1`,
    [key, roomId],
  );
  const row = rows?.[0];
  if (!row) return null;
  return {
    contributionId: String(row.id), status: row.status,
    amount: Number(row.amount), currency: row.currency,
    displayName: row.is_anonymous ? 'Anonymous' : row.display_name,
  };
}

export async function verifyAndConfirmSponsoredCrypto({
  roomId, contributionId, network = 'mainnet', txHash, senderWallet,
  recipientWallet, tokenCode, tokenMint = null, rawAmount, displayAmount,
}) {
  const [[row]] = await connection.execute(
    `SELECT c.*, pm.method_config
     FROM ${CONTRIBUTIONS_TABLE} c
     JOIN ${METHODS_TABLE} pm ON pm.id = c.club_payment_method_id
     WHERE c.id = ? AND c.room_id = ? LIMIT 1`,
    [contributionId, roomId],
  );
  if (!row) throw asStatusError('contribution_not_found', 404);
  if (row.status !== 'pending') throw asStatusError(`contribution_is_${row.status}`, 409);
  if (row.payment_method_category_snapshot !== 'crypto') throw asStatusError('not_a_crypto_contribution', 400);
  const cfg = parseJsonMaybe(row.method_config, {});
  const savedWallet = normalizeWallet(cfg.walletAddress);
  if (!savedWallet) throw asStatusError('crypto_wallet_not_configured', 422);
  if (normalizeWallet(recipientWallet) !== savedWallet) throw asStatusError('recipient_wallet_mismatch', 400);
  const resolvedNetwork = normalizeNetwork(network);
  const verified = await verifySolanaTransfer({
    txHash, network: resolvedNetwork, senderWallet,
    recipientWallet: savedWallet, tokenMint, rawAmount,
  });
  if (!verified.ok) throw asStatusError(verified.error || 'solana_verification_failed', 400);

  let convertedDisplayFiat = null;
  try {
    convertedDisplayFiat = await toFiat(tokenCode, Number(displayAmount || 0), row.currency);
  } catch {}

  await confirmSponsoredContributionAutomatic({
    contributionId,
    externalTransactionId: txHash,
    confirmedByName: 'Solana verification',
    crypto: {
      chain: 'solana', network: resolvedNetwork, senderWallet,
      recipientWallet: savedWallet, tokenCode, tokenMint,
      rawAmount: String(rawAmount), displayAmount: Number(displayAmount || 0),
    },
  });

  return {
    ok: true, contributionId: String(contributionId), txHash,
    resolvedNetwork, amount: Number(row.amount), currency: row.currency,
    convertedDisplayFiat,
  };
}
