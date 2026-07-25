// server/puzzles/services/puzzleDropService.js
//
// Puzzle Drop — room/item/pricing-tier/entitlement service.
//
// Mirrors quizTicketService.js's shape wherever the underlying concern is
// the same (room config reads, club-payment-method validation), but never
// imports from it directly — the spec (§11) is explicit that only the
// PATTERNS should be extracted/adapted, not the ticket-writing logic
// itself. Drop has no ticket table involvement at all (§10).
//
// Drop room lifecycle is deliberately simple (§3.1): no scheduled/live/
// completed lifecycle like quiz/elimination — just 'scheduled' until
// scheduled_at passes, then 'open' forever after (no "event night" to
// close). There is no cron here; the flip is lazy, the same pattern
// challengeService.js's maybeAutoCompleteChallenge already uses for
// challenge completion — checked (and applied) the moment anything reads
// the room's config, so it's never more than one read stale.

import database from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { createExpectedPayment, confirmPayment as confirmLedgerPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';
import { normalizePaymentMethod } from '../../utils/paymentMethods.js';
import QuizPaymentMethodsService from '../../mgtsystem/services/QuizPaymentMethodsService.js';
import EventIntegrationsService from '../../mgtsystem/services/EventIntegrationsService.js';
import { generatePuzzleForDropItem } from './puzzleGenerationService.js';

const paymentMethodsService = new QuizPaymentMethodsService();
const eventIntegrationsService = new EventIntegrationsService();

function toMysqlUtcDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function fromMysqlDateTimeAsUtcMs(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  return new Date(`${String(value).replace(' ', 'T')}Z`).getTime();
}

const WEB2_ROOMS_TABLE     = `fundraisely_web2_quiz_rooms`;
const DROP_ITEMS_TABLE     = `fundraisely_puzzle_drop_items`;
const DROP_TIERS_TABLE     = `fundraisely_puzzle_drop_pricing_tiers`;
const DROP_ENTITLEMENTS_TABLE = `fundraisely_puzzle_drop_entitlements`;
const CLUB_PAYMENT_METHODS_TABLE = `fundraisely_club_payment_methods`;

const DEBUG = false;

function parseJsonMaybe(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isTruthyDbBoolean(value) {
  return value === true || value === 1 || value === '1';
}

function normaliseProviderName(value) {
  return String(value || '').trim().toLowerCase();
}

function normaliseCategory(value) {
  return String(value || '').trim().toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Room creation
// ─────────────────────────────────────────────────────────────────────────────

export async function createDrop({
  roomId,
  clubId,
  hostId,
  hostName,
  scheduledAt,
  timeZone,
  currency = 'EUR',
  currencySymbol = '€',
  dropTitle = null,
  items = [],
  pricingTiers = [],
  onnightMethodIds = [],
}) {
  if (!items.length) {
    throw new Error('at_least_one_puzzle_item_required');
  }
  if (!pricingTiers.length) {
    throw new Error('at_least_one_pricing_tier_required');
  }

  const configJson = JSON.stringify({
    currency,
    currencySymbol,
    dropTitle,
  });

  const scheduledAtMysql = toMysqlUtcDateTime(scheduledAt);

  await database.connection.execute(
    `INSERT INTO ${WEB2_ROOMS_TABLE}
       (room_id, host_id, club_id, status, scheduled_at, time_zone,
        config_json, game_type)
     VALUES (?, ?, ?, 'scheduled', ?, ?, ?, 'puzzle_drop')`,
    [roomId, hostId, clubId, scheduledAtMysql, timeZone, configJson]
  );

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await database.connection.execute(
      `INSERT INTO ${DROP_ITEMS_TABLE}
         (id, drop_room_id, item_number, puzzle_type, difficulty, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), roomId, i + 1, item.puzzleType, item.difficulty ?? 'medium', i]
    );
  }

  for (let i = 0; i < pricingTiers.length; i++) {
    const tier = pricingTiers[i];
    await database.connection.execute(
      `INSERT INTO ${DROP_TIERS_TABLE}
         (id, drop_room_id, quantity, price, label, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), roomId, tier.quantity, tier.price, tier.label ?? null, i]
    );
  }

  if (onnightMethodIds.length > 0) {
    try {
      await paymentMethodsService.updateLinkedPaymentMethods({
        roomId,
        clubId,
        ticketMethodIds: [],
        onnightMethodIds,
        userId: hostId,
      });
    } catch (err) {
      console.warn('[PuzzleDropService] ⚠️ Failed to set payment methods for', roomId, ':', err.message);
    }

    await eventIntegrationsService.syncRoomPaymentMethodsToLinkedEvents({ roomId, clubId });
  }

  if (DEBUG) {
    console.log('[PuzzleDropService] ✅ Drop created:', { roomId, clubId, items: items.length, tiers: pricingTiers.length });
  }

  return { roomId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Room config reads
// ─────────────────────────────────────────────────────────────────────────────

async function maybeOpenDropRoom({ roomId, clubId, status, scheduledAt }) {
  if (status !== 'scheduled') return status;
  if (!scheduledAt) return status;

  const scheduledMs = fromMysqlDateTimeAsUtcMs(scheduledAt);
  if (scheduledMs === null || Number.isNaN(scheduledMs) || Date.now() < scheduledMs) return status;

  await database.connection.execute(
    `UPDATE ${WEB2_ROOMS_TABLE}
     SET status = 'open', updated_at = UTC_TIMESTAMP()
     WHERE room_id = ? AND club_id = ? AND status = 'scheduled'`,
    [roomId, clubId]
  );

  if (DEBUG) console.log('[PuzzleDropService] 🔓 Drop room lazily opened:', roomId);
  return 'open';
}

export async function getDropRoomConfig(roomId) {
  const [rows] = await database.connection.execute(
    `SELECT room_id, club_id, host_id, status, scheduled_at, time_zone,
            config_json, linked_payment_methods_json, game_type
     FROM ${WEB2_ROOMS_TABLE}
     WHERE room_id = ?
     LIMIT 1`,
    [roomId]
  );

  const row = rows?.[0];
  if (!row) {
    if (DEBUG) console.log('[PuzzleDropService] ❌ Room not found:', roomId);
    return null;
  }

  if (row.game_type !== 'puzzle_drop') {
    if (DEBUG) console.log('[PuzzleDropService] ❌ Not a Drop room:', roomId, row.game_type);
    return null;
  }

  const config = parseJsonMaybe(row.config_json, {});
  const linkedPaymentMethods = parseJsonMaybe(row.linked_payment_methods_json, {});

  const status = await maybeOpenDropRoom({
    roomId,
    clubId: row.club_id,
    status: row.status,
    scheduledAt: row.scheduled_at,
  });

  return {
    roomId: row.room_id,
    clubId: row.club_id,
    hostId: row.host_id,
    status,
    scheduledAt: row.scheduled_at ?? null,
    timeZone: row.time_zone ?? null,
    config,
    linkedPaymentMethods,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Items
// ─────────────────────────────────────────────────────────────────────────────

export async function getDropItems(roomId) {
  const [rows] = await database.connection.execute(
    `SELECT id, drop_room_id, item_number, puzzle_type, difficulty, display_order
     FROM ${DROP_ITEMS_TABLE}
     WHERE drop_room_id = ?
     ORDER BY display_order ASC, item_number ASC`,
    [roomId]
  );
  return rows;
}

export async function getDropItemById(itemId) {
  const [rows] = await database.connection.execute(
    `SELECT id, drop_room_id, item_number, puzzle_type, difficulty, display_order
     FROM ${DROP_ITEMS_TABLE}
     WHERE id = ?
     LIMIT 1`,
    [itemId]
  );
  return rows?.[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing tiers
// ─────────────────────────────────────────────────────────────────────────────

export async function getDropPricingTiers(roomId) {
  const [rows] = await database.connection.execute(
    `SELECT id, drop_room_id, quantity, price, label, display_order
     FROM ${DROP_TIERS_TABLE}
     WHERE drop_room_id = ?
     ORDER BY display_order ASC`,
    [roomId]
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment method validation
// ─────────────────────────────────────────────────────────────────────────────

function getDropLinkedMethodIds(linkedPaymentMethods) {
  const parsed = parseJsonMaybe(linkedPaymentMethods, {});
  const ids = Array.isArray(parsed.onnight_method_ids) ? parsed.onnight_method_ids : [];
  return new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)));
}

async function getDropClubPaymentMethod({ clubId, linkedPaymentMethods, clubPaymentMethodId }) {
  const numericMethodId = Number(clubPaymentMethodId);
  if (!Number.isFinite(numericMethodId)) {
    throw new Error('valid_club_payment_method_required_for_drop');
  }

  const linkedIds = getDropLinkedMethodIds(linkedPaymentMethods);
  if (!linkedIds.has(numericMethodId)) {
    throw new Error('payment_method_not_linked_to_this_drop');
  }

  const [rows] = await database.connection.execute(
    `SELECT id, club_id, method_category, provider_name, method_label,
            is_enabled, is_official_club_account, method_config
     FROM ${CLUB_PAYMENT_METHODS_TABLE}
     WHERE id = ? AND club_id = ?
     LIMIT 1`,
    [numericMethodId, clubId]
  );

  const method = rows?.[0];
  if (!method) throw new Error('payment_method_not_found_for_club');
  if (!isTruthyDbBoolean(method.is_enabled)) throw new Error('payment_method_disabled');

  return {
    id: String(method.id),
    clubId: method.club_id,
    methodCategory: normaliseCategory(method.method_category),
    providerName: normaliseProviderName(method.provider_name),
    methodLabel: method.method_label,
    isOfficialClubAccount: isTruthyDbBoolean(method.is_official_club_account),
    methodConfig: parseJsonMaybe(method.method_config, {}),
  };
}

export async function validateDropManualPaymentMethod({
  clubId,
  linkedPaymentMethods,
  clubPaymentMethodId,
}) {
  const method = await getDropClubPaymentMethod({ clubId, linkedPaymentMethods, clubPaymentMethodId });

  if (method.methodCategory !== 'instant_payment') {
    throw new Error('drop_manual_payment_method_must_be_instant_payment');
  }

  return { ...method, paymentMethod: 'instant_payment' };
}

export async function validateDropCryptoPaymentMethod({
  clubId,
  linkedPaymentMethods,
  clubPaymentMethodId,
}) {
  const method = await getDropClubPaymentMethod({ clubId, linkedPaymentMethods, clubPaymentMethodId });

  if (method.methodCategory !== 'crypto') {
    throw new Error('drop_crypto_payment_method_must_be_crypto');
  }
  if (method.providerName !== 'solana_wallet') {
    throw new Error('unsupported_crypto_drop_payment_method');
  }

  return { ...method, paymentMethod: 'crypto' };
}

export async function validateDropStripePaymentMethod({
  clubId,
  linkedPaymentMethods,
  clubPaymentMethodId,
}) {
  const method = await getDropClubPaymentMethod({ clubId, linkedPaymentMethods, clubPaymentMethodId });

  if (method.methodCategory !== 'stripe') {
    throw new Error('drop_stripe_payment_method_must_be_stripe');
  }

  return { ...method, paymentMethod: 'stripe' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entitlements
// ─────────────────────────────────────────────────────────────────────────────

export async function getEntitlementByAccessToken(accessToken) {
  const [rows] = await database.connection.execute(
    `SELECT *
     FROM ${DROP_ENTITLEMENTS_TABLE}
     WHERE access_token = ?
     LIMIT 1`,
    [accessToken]
  );
  return rows?.[0] || null;
}

export async function getEntitlementsForRoomAndEmail(roomId, buyerEmail) {
  const [rows] = await database.connection.execute(
    `SELECT *
     FROM ${DROP_ENTITLEMENTS_TABLE}
     WHERE drop_room_id = ? AND buyer_email = ?
     ORDER BY created_at DESC`,
    [roomId, buyerEmail]
  );
  return rows;
}

export async function getPublicDropInfo({ dropRoomId }) {
  const meta = await getPublicDropMeta({ dropRoomId });
  if (!meta) return null;

  const items = await getDropItems(dropRoomId);
  const pricingTiers = await getDropPricingTiers(dropRoomId);

  return {
    ...meta,
    items: items.map((i) => ({
      id: i.id,
      itemNumber: i.item_number,
      puzzleType: i.puzzle_type,
      difficulty: i.difficulty,
    })),
    pricingTiers: pricingTiers.map((t) => ({
      id: t.id,
      quantity: t.quantity,
      price: t.price,
      label: t.label,
    })),
  };
}

export async function getEntitlementById(entitlementId) {
  const [rows] = await database.connection.execute(
    `SELECT *
     FROM ${DROP_ENTITLEMENTS_TABLE}
     WHERE id = ?
     LIMIT 1`,
    [entitlementId]
  );
  return rows?.[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Club-side edit — read + update
// ─────────────────────────────────────────────────────────────────────────────

export async function getDropDetailForClub({ roomId, clubId }) {
  const room = await getDropRoomConfig(roomId);
  if (!room || room.clubId !== clubId) return null;

  const items = await getDropItems(roomId);
  const pricingTiers = await getDropPricingTiers(roomId);

  return { ...room, items, pricingTiers };
}

export async function updateDrop({
  roomId,
  clubId,
  scheduledAt,
  timeZone,
  currency,
  currencySymbol,
  dropTitle,
  items,
  pricingTiers,
  onnightMethodIds,
}) {
  const room = await getDropRoomConfig(roomId);
  if (!room) throw new Error('drop_not_found');
  if (room.clubId !== clubId) throw new Error('access_denied');
  if (room.status !== 'scheduled') {
    throw new Error('drop_not_editable — only drops not yet on sale can be edited here');
  }

  const sets = [];
  const params = [];

  if (scheduledAt !== undefined) {
    sets.push('scheduled_at = ?');
    params.push(toMysqlUtcDateTime(scheduledAt));
  }
  if (timeZone !== undefined) {
    sets.push('time_zone = ?');
    params.push(timeZone ?? null);
  }

  const configChanged = currency !== undefined || currencySymbol !== undefined || dropTitle !== undefined;
  if (configChanged) {
    const mergedConfig = {
      ...room.config,
      ...(currency !== undefined && { currency }),
      ...(currencySymbol !== undefined && { currencySymbol }),
      ...(dropTitle !== undefined && { dropTitle }),
    };
    sets.push('config_json = ?');
    params.push(JSON.stringify(mergedConfig));
  }

  if (sets.length > 0) {
    sets.push('updated_at = UTC_TIMESTAMP()');
    params.push(roomId, clubId);
    await database.connection.execute(
      `UPDATE ${WEB2_ROOMS_TABLE}
       SET ${sets.join(', ')}
       WHERE room_id = ? AND club_id = ? AND status = 'scheduled'`,
      params
    );
  }

  if (items !== undefined) {
    await database.connection.execute(`DELETE FROM ${DROP_ITEMS_TABLE} WHERE drop_room_id = ?`, [roomId]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await database.connection.execute(
        `INSERT INTO ${DROP_ITEMS_TABLE}
           (id, drop_room_id, item_number, puzzle_type, difficulty, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), roomId, i + 1, item.puzzleType, item.difficulty ?? 'medium', i]
      );
    }
  }

  if (pricingTiers !== undefined) {
    await database.connection.execute(`DELETE FROM ${DROP_TIERS_TABLE} WHERE drop_room_id = ?`, [roomId]);
    for (let i = 0; i < pricingTiers.length; i++) {
      const tier = pricingTiers[i];
      await database.connection.execute(
        `INSERT INTO ${DROP_TIERS_TABLE}
           (id, drop_room_id, quantity, price, label, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), roomId, tier.quantity, tier.price, tier.label ?? null, i]
      );
    }
  }

  if (onnightMethodIds !== undefined) {
    try {
      await paymentMethodsService.updateLinkedPaymentMethods({
        roomId,
        clubId,
        ticketMethodIds: [],
        onnightMethodIds,
      });
    } catch (err) {
      console.warn('[PuzzleDropService] ⚠️ Failed to update payment methods for', roomId, ':', err.message);
    }
    await eventIntegrationsService.syncRoomPaymentMethodsToLinkedEvents({ roomId, clubId });
  }

  return getDropDetailForClub({ roomId, clubId });
}

export async function getEntitlementsByLedgerId(ledgerId) {
  const [rows] = await database.connection.execute(
    `SELECT *
     FROM ${DROP_ENTITLEMENTS_TABLE}
     WHERE ledger_id = ?`,
    [ledgerId]
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase
// ─────────────────────────────────────────────────────────────────────────────

export async function createDropEntitlements({
  dropRoomId,
  itemIds,
  buyerName,
  buyerEmail,
  paymentMethod,
  paymentSource,
  paymentReference = null,
  externalTransactionId = null,
  clubPaymentMethodId,
  initialStatus,
}) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('at_least_one_item_required');
  }
  if (!buyerEmail) {
    throw new Error('buyer_email_required');
  }
  if (!['expected', 'claimed', 'confirmed'].includes(initialStatus)) {
    throw new Error('invalid_initial_status');
  }

  const room = await getDropRoomConfig(dropRoomId);
  if (!room) throw new Error('drop_not_found');

  const allItems = await getDropItems(dropRoomId);
  const selectedItems = itemIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter(Boolean);

  if (selectedItems.length !== itemIds.length) {
    throw new Error('invalid_item_selection');
  }

  const tiers = await getDropPricingTiers(dropRoomId);
  const tier = tiers.find((t) => t.quantity === selectedItems.length);
  if (!tier) {
    throw new Error('no_matching_pricing_tier');
  }
  const totalAmount = Number(tier.price);

  const now = new Date();
  const createdEntitlements = [];

  for (const item of selectedItems) {
    const entitlementId = uuidv4();
    const accessToken = nanoid(32);

    let puzzleInstanceId = null;
    if (initialStatus === 'confirmed') {
      const instance = await generatePuzzleForDropItem({
        dropRoomId,
        itemNumber: item.item_number,
        puzzleType: item.puzzle_type,
        difficulty: item.difficulty,
        clubId: room.clubId,
      });
      puzzleInstanceId = instance.id;
    }

    await database.connection.execute(
      `INSERT INTO ${DROP_ENTITLEMENTS_TABLE}
         (id, drop_room_id, item_id, buyer_email, buyer_name, access_token,
          payment_status, puzzle_instance_id, granted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entitlementId,
        dropRoomId,
        item.id,
        buyerEmail,
        buyerName ?? null,
        accessToken,
        initialStatus,
        puzzleInstanceId,
        initialStatus === 'confirmed' ? now : null,
      ]
    );

    createdEntitlements.push({
      id: entitlementId,
      itemId: item.id,
      itemNumber: item.item_number,
      puzzleType: item.puzzle_type,
      accessToken,
    });
  }

  const primaryEntitlementId = createdEntitlements[0].id;
  const ledgerPlayerId = `dropentitlement_${primaryEntitlementId}`;
  const normalisedPaymentMethod = normalizePaymentMethod(paymentMethod);

  const ledgerId = await createExpectedPayment({
    roomId: dropRoomId,
    clubId: room.clubId,
    playerId: ledgerPlayerId,
    playerName: buyerName || buyerEmail,
    ledgerType: 'entry_fee',
    amount: totalAmount,
    currency: room.config?.currency || 'EUR',
    paymentMethod: normalisedPaymentMethod,
    paymentSource,
    clubPaymentMethodId,
    paymentReference,
    externalTransactionId,
    claimedAt: initialStatus !== 'expected' ? now : null,
    confirmedAt: initialStatus === 'confirmed' ? now : null,
    confirmedBy: initialStatus === 'confirmed' ? 'system' : null,
    confirmedByName: initialStatus === 'confirmed' ? 'System' : null,
    confirmedByRole: initialStatus === 'confirmed' ? 'system' : null,
    status: initialStatus,
    extraMetadata: {
      itemIds: selectedItems.map((i) => i.id),
      itemNumbers: selectedItems.map((i) => i.item_number),
      quantity: selectedItems.length,
      pricingTierId: tier.id,
    },
  });

  for (const ent of createdEntitlements) {
    await database.connection.execute(
      `UPDATE ${DROP_ENTITLEMENTS_TABLE} SET ledger_id = ? WHERE id = ?`,
      [ledgerId, ent.id]
    );
  }

  if (DEBUG) {
    console.log('[PuzzleDropService] ✅ Purchase recorded:', {
      dropRoomId, buyerEmail, items: createdEntitlements.length, initialStatus, ledgerId,
    });
  }

  return {
    ledgerId,
    totalAmount,
    currency: room.config?.currency || 'EUR',
    entitlements: createdEntitlements,
  };
}

export async function attachStripeSessionToLedger({ ledgerId, sessionId }) {
  await database.connection.execute(
    `UPDATE fundraisely_quiz_payment_ledger
     SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [sessionId, ledgerId]
  );
}

export async function getEntitlementsBySessionId({ dropRoomId, sessionId }) {
  const [[ledgerRow]] = await database.connection.execute(
    `SELECT id
     FROM fundraisely_quiz_payment_ledger
     WHERE room_id = ? AND payment_reference = ?
     LIMIT 1`,
    [dropRoomId, sessionId]
  );
  if (!ledgerRow) return [];
  return getEntitlementsByLedgerId(ledgerRow.id);
}

export async function confirmDropPurchase({ entitlementId, confirmedBy, confirmedByName, confirmedByRole }) {
  const entitlement = await getEntitlementById(entitlementId);
  if (!entitlement) throw new Error('entitlement_not_found');
  if (entitlement.payment_status === 'confirmed') {
    throw new Error('entitlement_already_confirmed');
  }
  if (!entitlement.ledger_id) {
    throw new Error('entitlement_missing_ledger_id');
  }

  const siblings = await getEntitlementsByLedgerId(entitlement.ledger_id);
  const room = await getDropRoomConfig(entitlement.drop_room_id);
  if (!room) throw new Error('drop_not_found');

  const now = new Date();
  const confirmedIds = [];

  for (const ent of siblings) {
    if (ent.payment_status === 'confirmed') continue;

    const item = await getDropItemById(ent.item_id);
    if (!item) continue;

    const instance = await generatePuzzleForDropItem({
      dropRoomId: ent.drop_room_id,
      itemNumber: item.item_number,
      puzzleType: item.puzzle_type,
      difficulty: item.difficulty,
      clubId: room.clubId,
    });

    await database.connection.execute(
      `UPDATE ${DROP_ENTITLEMENTS_TABLE}
       SET payment_status = 'confirmed', puzzle_instance_id = ?, granted_at = ?
       WHERE id = ?`,
      [instance.id, now, ent.id]
    );

    confirmedIds.push(ent.id);
  }

  const ledgerPlayerId = `dropentitlement_${siblings[0].id}`;

  await confirmLedgerPayment({
    roomId: entitlement.drop_room_id,
    playerId: ledgerPlayerId,
    confirmedBy,
    confirmedByName,
    confirmedByRole,
  });

  if (DEBUG) {
    console.log('[PuzzleDropService] ✅ Purchase confirmed:', { entitlementId, confirmedIds });
  }

  return { ok: true, confirmedEntitlementIds: confirmedIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public leaderboards
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublicDropMeta({ dropRoomId }) {
  const room = await getDropRoomConfig(dropRoomId);
  if (!room) return null;
  if (room.status !== 'open' && room.status !== 'completed') return null;

  const [rows] = await database.connection.execute(
    `SELECT
       name AS club_name,
       brand_logo_url AS club_logo_url,
       brand_primary_color AS club_primary_color,
       brand_background_color AS club_background_color,
       brand_text_on_primary_color AS club_text_on_primary_color
     FROM fundraisely_clubs
     WHERE id = ?
     LIMIT 1`,
    [room.clubId]
  );
  const club = rows?.[0] || {};

  return {
    id: room.roomId,
    title: room.config?.dropTitle || 'Puzzle Drop',
    status: room.status,
    currency: room.config?.currency || 'EUR',
    currencySymbol: room.config?.currencySymbol || '€',
    clubName: club.club_name ?? null,
    clubLogoUrl: club.club_logo_url ?? null,
    clubPrimaryColor: club.club_primary_color ?? null,
    clubBackgroundColor: club.club_background_color ?? null,
    clubTextOnPrimaryColor: club.club_text_on_primary_color ?? null,
  };
}

function resolveBuyerDisplayName(buyerName) {
  const trimmed = String(buyerName || '').trim();
  return trimmed || 'Anonymous';
}

export async function getDropItemLeaderboard({ dropRoomId, itemNumber }) {
  const meta = await getPublicDropMeta({ dropRoomId });
  if (!meta) return null;

  const [[item]] = await database.connection.execute(
    `SELECT puzzle_type, difficulty
     FROM ${DROP_ITEMS_TABLE}
     WHERE drop_room_id = ? AND item_number = ?
     LIMIT 1`,
    [dropRoomId, itemNumber]
  );
  if (!item) return null;

  const [rows] = await database.connection.execute(
    `SELECT
       e.buyer_name,
       ss.total_score,
       ss.is_correct,
       ss.time_taken_seconds,
       ss.submitted_at
     FROM fundraisely_puzzle_submissions ss
     JOIN ${DROP_ENTITLEMENTS_TABLE} e ON e.id = ss.player_id COLLATE utf8mb4_unicode_ci
     WHERE ss.drop_room_id = ? AND ss.item_number = ?
     ORDER BY ss.total_score DESC, ss.time_taken_seconds ASC, ss.submitted_at ASC`,
    [dropRoomId, itemNumber]
  );

  return {
    challenge: meta,
    weekNumber: Number(itemNumber),
    puzzleType: item.puzzle_type,
    difficulty: item.difficulty,
    isFinal: false,
    entries: rows.map((row, index) => ({
      rank: index + 1,
      playerName: resolveBuyerDisplayName(row.buyer_name),
      totalScore: Number(row.total_score ?? 0),
      isCorrect: Boolean(row.is_correct),
      timeTakenSeconds: row.time_taken_seconds ?? null,
      submittedAt: row.submitted_at ?? null,
    })),
  };
}

export async function completeDrop({ roomId, clubId }) {
  const room = await getDropRoomConfig(roomId);
  if (!room) throw new Error('drop_not_found');
  if (room.clubId !== clubId) throw new Error('access_denied');
  if (room.status === 'completed') {
    throw new Error('drop_already_completed');
  }

  await database.connection.execute(
    `UPDATE ${WEB2_ROOMS_TABLE}
     SET status = 'completed', updated_at = UTC_TIMESTAMP()
     WHERE room_id = ? AND club_id = ?`,
    [roomId, clubId]
  );

  if (DEBUG) {
    console.log('[PuzzleDropService] ✅ Drop marked completed:', { roomId, clubId });
  }

  return { ok: true, roomId, status: 'completed' };
}

export async function getDropPurchasesForClub({ roomId, clubId }) {
  const room = await getDropRoomConfig(roomId);
  if (!room || room.clubId !== clubId) return null;

  const [rows] = await database.connection.execute(
    `SELECT
       e.id            AS entitlement_id,
       e.item_id,
       e.buyer_email,
       e.buyer_name,
       e.payment_status,
       e.ledger_id,
       e.created_at    AS entitlement_created_at,
       i.item_number,
       i.puzzle_type,
       l.amount,
       l.currency,
       l.payment_method,
       l.payment_source,
       l.status         AS ledger_status,
       l.confirmed_at,
       l.confirmed_by_name,
       l.payment_reference,
       l.created_at     AS ledger_created_at
     FROM ${DROP_ENTITLEMENTS_TABLE} e
     JOIN ${DROP_ITEMS_TABLE} i ON i.id = e.item_id
     LEFT JOIN fundraisely_quiz_payment_ledger l ON l.id = e.ledger_id
     WHERE e.drop_room_id = ?
     ORDER BY e.created_at DESC`,
    [roomId]
  );

  const purchasesById = new Map();

  for (const row of rows) {
    const key = row.ledger_id || `no-ledger:${row.entitlement_id}`;

    if (!purchasesById.has(key)) {
      purchasesById.set(key, {
        ledgerId: row.ledger_id,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        amount: row.amount !== null ? Number(row.amount) : null,
        currency: row.currency || room.config?.currency || 'EUR',
        paymentMethod: row.payment_method,
        paymentSource: row.payment_source,
        paymentReference: row.payment_reference,
        status: row.ledger_status || row.payment_status,
        confirmedAt: row.confirmed_at,
        confirmedByName: row.confirmed_by_name,
        createdAt: row.ledger_created_at || row.entitlement_created_at,
        // needed so the Purchases tab knows which entitlementId to pass
        // to the existing confirm route — confirming ANY one entitlement
        // on this ledger confirms all siblings (see confirmDropPurchase)
        primaryEntitlementId: row.entitlement_id,
        items: [],
      });
    }

    purchasesById.get(key).items.push({
      entitlementId: row.entitlement_id,
      itemNumber: row.item_number,
      puzzleType: row.puzzle_type,
      paymentStatus: row.payment_status,
    });
  }

  const purchases = [...purchasesById.values()].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  return { purchases };
}

export async function getPublicDropSummary({ dropRoomId }) {
  const meta = await getPublicDropMeta({ dropRoomId });
  if (!meta) return null;

  const [rankedRows] = await database.connection.execute(
    `SELECT item_number, buyer_name, total_score, is_correct,
            time_taken_seconds, submitted_at, item_rank, item_player_count
     FROM (
       SELECT
         ss.item_number,
         e.buyer_name,
         ss.total_score,
         ss.is_correct,
         ss.time_taken_seconds,
         ss.submitted_at,
         ROW_NUMBER() OVER (
           PARTITION BY ss.item_number
           ORDER BY ss.total_score DESC, ss.time_taken_seconds ASC, ss.submitted_at ASC
         ) AS item_rank,
         COUNT(*) OVER (PARTITION BY ss.item_number) AS item_player_count
       FROM fundraisely_puzzle_submissions ss
       JOIN ${DROP_ENTITLEMENTS_TABLE} e ON e.id = ss.player_id COLLATE utf8mb4_unicode_ci
       WHERE ss.drop_room_id = ?
     ) ranked
     WHERE item_rank <= 3
     ORDER BY item_number ASC, item_rank ASC`,
    [dropRoomId]
  );

  const items = await getDropItems(dropRoomId);

  const topByItem = {};
  for (const row of rankedRows) {
    if (!topByItem[row.item_number]) topByItem[row.item_number] = { top: [], playerCount: 0 };
    topByItem[row.item_number].playerCount = Number(row.item_player_count ?? 0);
    topByItem[row.item_number].top.push({
      rank: Number(row.item_rank),
      playerName: resolveBuyerDisplayName(row.buyer_name),
      totalScore: Number(row.total_score ?? 0),
      isCorrect: Boolean(row.is_correct),
      timeTakenSeconds: row.time_taken_seconds ?? null,
    });
  }

  return {
    challenge: meta,
    isFinal: false,
    weeks: items.map(item => ({
      weekNumber: item.item_number,
      puzzleType: item.puzzle_type,
      difficulty: item.difficulty,
      isUnlocked: true,
      playerCount: topByItem[item.item_number]?.playerCount ?? 0,
      top: topByItem[item.item_number]?.top ?? [],
    })),
  };
}
export async function openDropNow({ roomId, clubId }) {
  const room = await getDropRoomConfig(roomId);
  if (!room) throw new Error('drop_not_found');
  if (room.clubId !== clubId) throw new Error('access_denied');
  if (room.status !== 'scheduled') {
    throw new Error('drop_not_schedulable'); // already open/completed/cancelled
  }

  await database.connection.execute(
    `UPDATE ${WEB2_ROOMS_TABLE}
     SET status = 'open', updated_at = UTC_TIMESTAMP()
     WHERE room_id = ? AND club_id = ? AND status = 'scheduled'`,
    [roomId, clubId]
  );

  if (DEBUG) console.log('[PuzzleDropService] 🔓 Drop opened manually by host:', { roomId, clubId });

  return { ok: true, roomId, status: 'open' };
}