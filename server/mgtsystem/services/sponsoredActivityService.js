// server/mgtsystem/services/sponsoredActivityService.js

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  resolveEntitlements,
  consumeCredit,
} from '../../policy/entitlements.js';
import QuizPaymentMethodsService from './QuizPaymentMethodsService.js';
import EventIntegrationsService from './EventIntegrationsService.js';

const TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
const ENTITLEMENT_SCOPE = 'sponsored_activity';

const paymentMethodsService = new QuizPaymentMethodsService();
const integrationsService = new EventIntegrationsService();

function httpError(message, statusCode, details = {}) {
  return Object.assign(new Error(message), {
    statusCode,
    ...details,
  });
}

function mysqlUtc(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanAmounts(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(Number)
        .filter((amount) => Number.isFinite(amount) && amount > 0),
    ),
  ].slice(0, 5);
}

function parseConfig(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function noCreditsMessage(planCode) {
  if (planCode === 'FREE' || planCode === 'FREE_FALLBACK') {
    return "You've used your free Sponsored Activity. Upgrade your plan to create another.";
  }

  return "You've used all your game credits for this month. Upgrade your plan or wait until your credits reset.";
}

async function getRoom({ clubId, roomId }) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM ${TABLE}
     WHERE club_id = ?
       AND room_id = ?
       AND game_type = 'sponsored_activity'
     LIMIT 1`,
    [clubId, roomId],
  );

  return rows?.[0] || null;
}

async function resolveSponsoredActivityEntitlement(clubId) {
  const entitlements = await resolveEntitlements({
    userId: clubId,
    scope: ENTITLEMENT_SCOPE,
  });

  const creditsRemaining = Number(
    entitlements?.game_credits_remaining ?? 0,
  );

  console.log('[SponsoredActivity] Entitlement check:', {
    clubId,
    planCode: entitlements?.plan_code,
    scope: entitlements?.scope,
    creditKey: entitlements?.credit_key,
    creditsRemaining,
  });

  if (creditsRemaining <= 0) {
    throw httpError('no_credits', 402, {
      publicMessage: noCreditsMessage(entitlements?.plan_code),
      upgradeUrl: '/settings/billing',
      planCode: entitlements?.plan_code,
      creditKey: entitlements?.credit_key,
      creditsRemaining,
    });
  }

  return {
    entitlements,
    creditsRemaining,
  };
}

export async function createSponsoredActivity({
  clubId,
  roomId,
  hostId,
  hostName,
  sponsorshipOpensAt,
  sponsorshipClosesAt,
  timeZone,
  activityKind,
  customActivityLabel,
  suggestedAmounts,
  currency,
  onnightMethodIds = [],
}) {
  if (!clubId || !roomId || !hostId) {
    throw httpError('missing_required_fields', 400);
  }

  // Resolve before any room/payment-method rows are written.
  // FREE resolves to credit_key='sponsored_activity'.
  // GROWTH/PRO/DEV resolve to the pooled credit_key='games'.
  const { entitlements, creditsRemaining } =
    await resolveSponsoredActivityEntitlement(clubId);

  const opens = mysqlUtc(sponsorshipOpensAt);
  const closes = mysqlUtc(sponsorshipClosesAt);

  if (
    !opens ||
    !closes ||
    new Date(sponsorshipClosesAt) <= new Date(sponsorshipOpensAt)
  ) {
    throw httpError('invalid_sponsorship_window', 400);
  }

  const amounts = cleanAmounts(suggestedAmounts);
  if (!amounts.length) {
    throw httpError('suggested_amount_required', 400);
  }

  if (
    activityKind === 'other' &&
    !String(customActivityLabel || '').trim()
  ) {
    throw httpError('custom_activity_label_required', 400);
  }

  const config = {
    gameType: ENTITLEMENT_SCOPE,
    activityKind,
    customActivityLabel:
      String(customActivityLabel || '').trim() || null,
    suggestedAmounts: amounts,
    allowOtherAmount: true,
    currency: currency || 'EUR',
    hostName: hostName || null,
  };

  await connection.execute(
    `INSERT INTO ${TABLE} (
       room_id,
       host_id,
       club_id,
       status,
       game_type,
       scheduled_at,
       ended_at,
       time_zone,
       config_json,
       reconciliation_status,
       created_at,
       updated_at
     ) VALUES (
       ?, ?, ?, 'scheduled', 'sponsored_activity', ?, ?, ?, ?,
       'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP()
     )`,
    [
      roomId,
      hostId,
      clubId,
      opens,
      closes,
      timeZone || null,
      JSON.stringify(config),
    ],
  );

  await paymentMethodsService.updateLinkedPaymentMethods({
    roomId,
    clubId,
    ticketMethodIds: [],
    onnightMethodIds,
    userId: hostId,
  });

  await integrationsService.syncRoomPaymentMethodsToLinkedEvents({
    roomId,
    clubId,
  });

  // Consume only after the Sponsored Activity has been created successfully.
  // consumeCredit applies the plan mapping internally:
  // FREE => sponsored_activity; GROWTH/PRO/DEV => games.
  const creditResult = await consumeCredit(
    clubId,
    ENTITLEMENT_SCOPE,
    entitlements.plan_code,
  );

  if (!creditResult.ok) {
    // This mirrors the established game-creation pattern. The room is valid,
    // but a simultaneous request may have consumed the last credit between
    // the initial read and the atomic decrement. Log it prominently so it can
    // be reconciled until credit consumption is moved into one DB transaction.
    console.error(
      '[SponsoredActivity] Activity created but credit was not consumed:',
      {
        clubId,
        roomId,
        planCode: entitlements.plan_code,
        creditKey: entitlements.credit_key,
        reason: creditResult.reason,
      },
    );
  }

  return {
    roomId,
    room: await getRoom({ clubId, roomId }),
    entitlement: {
      planCode: entitlements.plan_code,
      scope: ENTITLEMENT_SCOPE,
      creditKey: entitlements.credit_key,
      creditsBefore: creditsRemaining,
      creditsAfter: creditResult.ok
        ? Math.max(0, creditsRemaining - 1)
        : creditsRemaining,
      creditConsumed: creditResult.ok,
    },
  };
}

export async function updateSponsoredActivity({
  clubId,
  roomId,
  sponsorshipOpensAt,
  sponsorshipClosesAt,
  timeZone,
  activityKind,
  customActivityLabel,
  suggestedAmounts,
  currency,
  onnightMethodIds,
}) {
  const current = await getRoom({ clubId, roomId });

  if (!current) {
    throw httpError('not_found', 404);
  }

  if (current.status !== 'scheduled') {
    throw httpError('room_not_editable', 409, {
      currentStatus: current.status,
    });
  }

  const existingOpens = current.scheduled_at;
  const existingCloses = current.ended_at;

  const nextOpens = sponsorshipOpensAt !== undefined
    ? mysqlUtc(sponsorshipOpensAt)
    : existingOpens;

  const nextCloses = sponsorshipClosesAt !== undefined
    ? mysqlUtc(sponsorshipClosesAt)
    : existingCloses;

  if (
    !nextOpens ||
    !nextCloses ||
    new Date(nextCloses) <= new Date(nextOpens)
  ) {
    throw httpError('invalid_sponsorship_window', 400);
  }

  const next = {
    ...parseConfig(current.config_json),
  };

  if (activityKind !== undefined) {
    next.activityKind = activityKind;
  }

  if (customActivityLabel !== undefined) {
    next.customActivityLabel =
      String(customActivityLabel || '').trim() || null;
  }

  if (suggestedAmounts !== undefined) {
    const amounts = cleanAmounts(suggestedAmounts);

    if (!amounts.length) {
      throw httpError('suggested_amount_required', 400);
    }

    next.suggestedAmounts = amounts;
  }

  if (
    next.activityKind === 'other' &&
    !String(next.customActivityLabel || '').trim()
  ) {
    throw httpError('custom_activity_label_required', 400);
  }

  if (currency !== undefined) {
    next.currency = currency || 'EUR';
  }

  const sets = [
    'config_json = ?',
    'updated_at = UTC_TIMESTAMP()',
  ];
  const params = [JSON.stringify(next)];

  if (sponsorshipOpensAt !== undefined) {
    sets.unshift('scheduled_at = ?');
    params.unshift(nextOpens);
  }

  if (sponsorshipClosesAt !== undefined) {
    sets.unshift('ended_at = ?');
    params.unshift(nextCloses);
  }

  if (timeZone !== undefined) {
    sets.unshift('time_zone = ?');
    params.unshift(timeZone || null);
  }

  params.push(clubId, roomId);

  const [result] = await connection.execute(
    `UPDATE ${TABLE}
     SET ${sets.join(', ')}
     WHERE club_id = ?
       AND room_id = ?
       AND game_type = 'sponsored_activity'
       AND status = 'scheduled'
     LIMIT 1`,
    params,
  );

  if (result.affectedRows === 0) {
    const latest = await getRoom({ clubId, roomId });

    if (!latest) {
      throw httpError('not_found', 404);
    }

    throw httpError('room_not_editable', 409, {
      currentStatus: latest.status,
    });
  }

  if (onnightMethodIds !== undefined) {
    await paymentMethodsService.updateLinkedPaymentMethods({
      roomId,
      clubId,
      ticketMethodIds: [],
      onnightMethodIds,
      userId: current.host_id,
    });

    await integrationsService.syncRoomPaymentMethodsToLinkedEvents({
      roomId,
      clubId,
    });
  }

  return {
    room: await getRoom({ clubId, roomId }),
  };
}

export { getRoom as getSponsoredActivity };
