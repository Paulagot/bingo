// server/quiz/services/quizTicketService.js
// UPDATED: Added capacity checks before ticket purchase
// UPDATED: Validates ticket-safe payment methods server-side

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createExpectedPayment } from './quizPaymentLedgerService.js';
import { canPurchaseTickets } from './quizCapacityService.js';
import { currencyFromSymbol } from '../../utils/currencyUtils.js';

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
const CLUB_PAYMENT_METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

const DEBUG = false;

const TICKET_MANUAL_PROVIDER_ALLOWLIST = new Set([
  'revolut',
  'monzo',
  'bank_transfer',
  'zippypay',
]);

function parseJsonMaybe(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseMysqlUtcDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  // MySQL DATETIME like "2026-04-22 19:30:00" has no timezone marker.
  // Treat stored values as UTC.
  const parsed = new Date(`${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseProviderName(value) {
  return String(value || '').trim().toLowerCase();
}

function normaliseCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function getLinkedPaymentMethodIds(linkedPaymentMethodsJson, context = 'tickets') {
  const parsed = parseJsonMaybe(linkedPaymentMethodsJson, {});
  let ids;
  if (context === 'tickets') {
    ids = parsed.ticket_method_ids ?? parsed.payment_method_ids ?? [];
  } else {
    ids = parsed.onnight_method_ids ?? parsed.payment_method_ids ?? [];
  }
  if (!Array.isArray(ids)) ids = [];
  return new Set(
    ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
  );
}

function isTruthyDbBoolean(value) {
  return value === true || value === 1 || value === '1';
}

/**
 * Get room configuration from database.
 * Returns null if room not found or is Web3.
 */
export async function getRoomConfig(roomId) {
  const sql = `
    SELECT
      room_id,
      club_id,
      status,
      scheduled_at,
      time_zone,
      config_json,
      room_caps_json,
      linked_payment_methods_json,
      game_type
    FROM ${WEB2_ROOMS_TABLE}
    WHERE room_id = ?
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [roomId]);
  const row = rows?.[0];

  if (!row) {
    if (DEBUG) console.log('[TicketService] ❌ Room not found:', roomId);
    return null;
  }

  const config = parseJsonMaybe(row.config_json, {});
  const roomCaps = parseJsonMaybe(row.room_caps_json, {});
  const linkedPaymentMethods = parseJsonMaybe(
    row.linked_payment_methods_json,
    {}
  );

  // ✅ Block Web3 rooms
  if (config.paymentMethod === 'web3' || config.isWeb3Room === true) {
    if (DEBUG) {
      console.log(
        '[TicketService] ❌ Web3 room - tickets not supported:',
        roomId
      );
    }

    return null;
  }
  return {
    roomId: row.room_id,
    clubId: row.club_id,
    status: row.status,
    scheduledAt: row.scheduled_at ?? null,
    timeZone: row.time_zone ?? null,
    config,
    roomCaps,
    linkedPaymentMethods,
    gameType: row.game_type || 'quiz',   // ← new
  };
}

async function getClubPaymentMethodForRoom({
  roomId,
  clubId,
  linkedPaymentMethods,
  clubPaymentMethodId,
  context = 'tickets',
  roomStatus = null,       // ← new: 'scheduled' | 'open' | 'live' | etc.
}) {
  const numericMethodId = Number(clubPaymentMethodId);
 
  if (!Number.isFinite(numericMethodId)) {
    throw new Error('valid_club_payment_method_required_for_ticket');
  }
 
  // When the room is open (check-in running), guests paying at the door
  // should be able to use onnight_method_ids (includes cash, card tap).
  // For advance ticket sales (scheduled), use ticket_method_ids only.
  const resolvedContext = roomStatus === 'open' ? 'onnight' : context;
  const linkedIds = getLinkedPaymentMethodIds(linkedPaymentMethods, resolvedContext);
 
  if (!linkedIds.has(numericMethodId)) {
    if (DEBUG) {
      console.log('[TicketService] ❌ Payment method not linked to quiz:', {
        roomId,
        clubId,
        clubPaymentMethodId,
        linkedIds: Array.from(linkedIds),
      });
    }

    throw new Error('payment_method_not_linked_to_this_quiz');
  }

  const [rows] = await connection.execute(
    `
    SELECT
      id,
      club_id,
      method_category,
      provider_name,
      method_label,
      is_enabled,
      is_official_club_account,
      method_config
    FROM ${CLUB_PAYMENT_METHODS_TABLE}
    WHERE id = ?
      AND club_id = ?
    LIMIT 1
    `,
    [numericMethodId, clubId]
  );

  const method = rows?.[0];

  if (!method) {
    throw new Error('payment_method_not_found_for_club');
  }

  if (!isTruthyDbBoolean(method.is_enabled)) {
    throw new Error('payment_method_disabled');
  }

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

async function validateManualTicketPaymentMethod({
  roomId,
  clubId,
  linkedPaymentMethods,
  clubPaymentMethodId,
  roomStatus = null,       // ← new
}) {
  const method = await getClubPaymentMethodForRoom({
    roomId,
    clubId,
    linkedPaymentMethods,
    clubPaymentMethodId,
    context: 'tickets',
    roomStatus,              // ← passed through — switches to onnight when open
  });
 
  if (method.methodCategory !== 'instant_payment') {
    throw new Error('ticket_manual_payment_method_must_be_manual');
  }
 
  // Cash and card tap are only allowed when the room is open (guest is
  // physically present). Block them for advance ticket purchases.
  if (method.providerName === 'cash' || method.providerName === 'card_tap') {
    if (roomStatus !== 'open') {
      throw new Error('pay_at_door_not_allowed_for_ticket_purchase');
    }
    // Room is open — allow it through
    return {
      ...method,
      paymentMethod: 'instant_payment',
    };
  }
 
  if (!TICKET_MANUAL_PROVIDER_ALLOWLIST.has(method.providerName)) {
    throw new Error('payment_method_not_allowed_for_ticket_purchase');
  }
 
  return {
    ...method,
    paymentMethod: 'instant_payment',
  };
}

export async function validateCryptoTicketPaymentMethod({
  roomId,
  clubId,
  linkedPaymentMethods,
  clubPaymentMethodId,
}) {
  const method = await getClubPaymentMethodForRoom({
    roomId,
    clubId,
    linkedPaymentMethods,
    clubPaymentMethodId,
  });

  if (method.methodCategory !== 'crypto') {
    throw new Error('ticket_crypto_payment_method_must_be_crypto');
  }

  if (method.providerName !== 'solana_wallet') {
    throw new Error('unsupported_crypto_ticket_payment_method');
  }

  return {
    ...method,
    paymentMethod: 'crypto',
  };
}

/**
 * Create ticket with payment claim in ONE STEP.
 * Manual public ticket purchases only.
 *
 * Stripe checkout and crypto verified tickets have their own flows.
 */
export async function createTicketWithPayment({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
  selectedExtras = [],
  donationAmount = null,
  paymentMethod,
  paymentReference,
  clubPaymentMethodId = null,
}) {
  // ✅ STEP 0: CHECK CAPACITY FIRST
  const capacityCheck = await canPurchaseTickets(roomId, 1);

  if (!capacityCheck.allowed) {
    if (DEBUG) {
      console.log('[TicketService] 🚫 Ticket purchase blocked:', {
        roomId,
        reason: capacityCheck.reason,
        capacity: capacityCheck.capacity,
      });
    }

    throw new Error(capacityCheck.reason);
  }

  if (DEBUG) {
    console.log('[TicketService] ✅ Capacity check passed:', {
      roomId,
      availableForTickets: capacityCheck.capacity.availableForTickets,
      maxCapacity: capacityCheck.capacity.maxCapacity,
    });
  }

  // 1. Get room config
  const roomData = await getRoomConfig(roomId);

  if (!roomData) {
    throw new Error('Room not found or not available for ticket purchase');
  }

  const { clubId, config, linkedPaymentMethods, status: roomStatus } = roomData;
 
  const validatedPaymentMethod = await validateManualTicketPaymentMethod({
    roomId,
    clubId,
    linkedPaymentMethods,
    clubPaymentMethodId,
    roomStatus,              // ← 'scheduled' | 'open' | etc.
  });

  // Do not trust client-supplied paymentMethod.
  paymentMethod = validatedPaymentMethod.paymentMethod;
  clubPaymentMethodId = validatedPaymentMethod.id;

  // 2. Calculate pricing
  const isDonationRoom = config?.fundraisingMode === 'donation';

  let entryFee = 0;
  let extrasTotal = 0;
  let totalAmount = 0;
  const extrasWithPrices = [];

 const currency = currencyFromSymbol(config.currencySymbol);

  if (isDonationRoom) {
    const parsedDonation = Number(donationAmount);

    if (!Number.isFinite(parsedDonation) || parsedDonation <= 0) {
      throw new Error('invalid_donation_amount_for_ticket');
    }

    entryFee = parsedDonation;
    extrasTotal = 0;
    totalAmount = parsedDonation;

    // Donation tickets include enabled extras automatically.
    // Do not create priced extra rows.
  } else {
    entryFee = parseFloat(config.entryFee || 0);

    for (const extraId of selectedExtras) {
      const price = config.fundraisingPrices?.[extraId] || 0;

      if (price > 0) {
        extrasTotal += price;
        extrasWithPrices.push({ extraId, price });
      }
    }

    totalAmount = entryFee + extrasTotal;
  }

  // 3. Generate unique IDs
  const ticketId = nanoid(12);
  const joinToken = nanoid(16);

  // 4. Insert ticket WITH payment claimed (skips pending_payment)
  const sql = `
    INSERT INTO ${TICKETS_TABLE}
      (
        ticket_id,
        room_id,
        club_id,
        purchaser_name,
        purchaser_email,
        purchaser_phone,
        player_name,
        entry_fee,
        extras,
        extras_total,
        total_amount,
        currency,
        payment_status,
        payment_method,
        payment_reference,
        club_payment_method_id,
        redemption_status,
        join_token
      )
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_claimed', ?, ?, ?, 'blocked', ?)
  `;

  const params = [
    ticketId,
    roomId,
    clubId,
    purchaserName,
    purchaserEmail,
    purchaserPhone,
    playerName || purchaserName,
    entryFee,
    JSON.stringify(extrasWithPrices),
    extrasTotal,
    totalAmount,
    currency,
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
    joinToken,
  ];

  await connection.execute(sql, params);

  // 5. Create ledger entries (entry fee)
  const playerId = `ticket_${ticketId}`;

  const ledgerId = await createExpectedPayment({
    roomId,
    clubId,
    playerId,
    playerName: playerName || purchaserName,
    ledgerType: 'entry_fee',
    amount: entryFee,
    currency,
    paymentMethod,
    paymentSource: 'player_claimed',
    clubPaymentMethodId,
    paymentReference,
    claimedAt: new Date(),
    ticketId,
    extraMetadata: isDonationRoom
      ? {
          fundraisingMode: 'donation',
          donationAmount: entryFee,
          paymentMethodLabel: validatedPaymentMethod.methodLabel,
          paymentProvider: validatedPaymentMethod.providerName,
          isOfficialClubAccount: validatedPaymentMethod.isOfficialClubAccount,
        }
      : {
          paymentMethodLabel: validatedPaymentMethod.methodLabel,
          paymentProvider: validatedPaymentMethod.providerName,
          isOfficialClubAccount: validatedPaymentMethod.isOfficialClubAccount,
        },
  });

  // 6. Create ledger entries (extras)
  // Fixed-fee tickets only. Donation tickets include extras automatically.
  if (!isDonationRoom) {
    for (const extra of extrasWithPrices) {
      await createExpectedPayment({
        roomId,
        clubId,
        playerId,
        playerName: playerName || purchaserName,
        ledgerType: 'extra_purchase',
        amount: extra.price,
        currency,
        paymentMethod,
        paymentSource: 'player_claimed',
        clubPaymentMethodId,
        paymentReference,
        claimedAt: new Date(),
        extraId: extra.extraId,
        extraMetadata: {
          ...extra,
          paymentMethodLabel: validatedPaymentMethod.methodLabel,
          paymentProvider: validatedPaymentMethod.providerName,
          isOfficialClubAccount: validatedPaymentMethod.isOfficialClubAccount,
        },
        ticketId,
      });
    }
  }

  // 7. Update ticket with ledger ID
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [ledgerId, ticketId]
  );

  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket created with payment claimed:', {
      ticketId,
      roomId,
      purchaserName,
      entryFee,
      extrasTotal,
      totalAmount,
      currency,
      paymentReference,
      clubPaymentMethodId,
      paymentMethodLabel: validatedPaymentMethod.methodLabel,
      paymentProvider: validatedPaymentMethod.providerName,
    });
  }

  return {
    ticketId,
    joinToken,
    roomId,
    clubId,
    purchaserName,
    purchaserEmail,
    playerName: playerName || purchaserName,
    entryFee,
    extrasTotal,
    totalAmount,
    currency,
    extras: extrasWithPrices,
    fundraisingMode: isDonationRoom ? 'donation' : 'fixed_fee',
    donationAmount: isDonationRoom ? entryFee : null,
    paymentStatus: 'payment_claimed',
    redemptionStatus: 'blocked',
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
  };
}

/**
 * Create a donation ticket after a crypto payment has already been verified on-chain.
 *
 * Used by the crypto ticket donation route.
 *
 * Difference from createTicketWithPayment:
 * - payment is already verified
 * - ticket is immediately payment_confirmed + ready
 * - ledger row is confirmed + onchain_auto
 * - no host manual confirmation required
 */
export async function createCryptoDonationTicketWithConfirmedPayment({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
 
  donationFiat = 0,     // amount in the room's currency (from toFiat conversion)
  currency,             // ISO code e.g. 'USD', 'GBP', 'EUR' — derived from room config
 
  clubPaymentMethodId,
  paymentReference,
  externalTransactionId,
  web3TransactionId = null,
 
  tokenCode = null,
  cryptoAmount = null,
  cryptoRawAmount = null,
  network = 'mainnet',
  senderWallet = null,
  recipientWallet = null,
 
  includedDonationExtras = [],
}) {
  // 0. Capacity check first
  const capacityCheck = await canPurchaseTickets(roomId, 1);
  if (!capacityCheck.allowed) {
    throw new Error(capacityCheck.reason);
  }
 
  // 1. Get room config
  const roomData = await getRoomConfig(roomId);
  if (!roomData) {
    throw new Error('Room not found or not available for ticket purchase');
  }
 
  const { clubId, config, linkedPaymentMethods } = roomData;
 
  const validatedPaymentMethod = await validateCryptoTicketPaymentMethod({
    roomId,
    clubId,
    linkedPaymentMethods,
    clubPaymentMethodId,
  });
 
  clubPaymentMethodId = validatedPaymentMethod.id;
 
  const isDonationRoom = config?.fundraisingMode === 'donation';
  if (!isDonationRoom) {
    throw new Error('crypto_tickets_only_supported_for_donation_rooms');
  }
 
  // Derive currency from room config — this is the source of truth.
  // The caller also passes currency but we verify against the room.
  const roomCurrency = currencyFromSymbol(config.currencySymbol) || currency || 'EUR';
 
  const safeAmount = Number(donationFiat);
  if (!Number.isFinite(safeAmount) || safeAmount < 0) {
    throw new Error('invalid_crypto_ticket_donation_amount');
  }
 
  if (!clubPaymentMethodId) {
    throw new Error('clubPaymentMethodId is required');
  }
 
  if (!paymentReference || !externalTransactionId) {
    throw new Error('paymentReference and externalTransactionId are required');
  }
 
  const extrasForTicket = Array.isArray(includedDonationExtras)
    ? includedDonationExtras.map((extraId) => ({
        extraId,
        price: 0,
        included: true,
        source: 'donation_room',
      }))
    : [];
 
  const ticketId      = nanoid(12);
  const joinToken     = nanoid(16);
  const tempPlayerId  = `ticket_${ticketId}`;
  const finalPlayerName = playerName || purchaserName;
  const now = new Date();
 
  // 2. Insert ticket as already confirmed and ready
  const ticketSql = `
    INSERT INTO ${TICKETS_TABLE}
      (
        ticket_id, room_id, club_id,
        purchaser_name, purchaser_email, purchaser_phone, player_name,
        entry_fee, extras, extras_total, total_amount, currency,
        payment_status, payment_method, payment_reference, club_payment_method_id,
        redemption_status, join_token,
        confirmed_at, confirmed_by, confirmed_by_name, confirmed_by_role,
        created_at, updated_at
      )
    VALUES
      (
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'payment_confirmed', 'crypto', ?, ?,
        'ready', ?,
        UTC_TIMESTAMP(), 'system', 'System', 'system',
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
      )
  `;
 
  await connection.execute(ticketSql, [
    ticketId, roomId, clubId,
    purchaserName, purchaserEmail, purchaserPhone, finalPlayerName,
    safeAmount,                    // entry_fee — in room currency
    JSON.stringify(extrasForTicket),
    0,                             // extras_total
    safeAmount,                    // total_amount — in room currency
    roomCurrency,                  // currency — e.g. 'USD', 'GBP', 'EUR'
    paymentReference, clubPaymentMethodId,
    joinToken,
  ]);
 
  // 3. Create one confirmed ledger row
  const ledgerId = await createExpectedPayment({
    roomId,
    clubId,
    playerId: tempPlayerId,
    playerName: finalPlayerName,
    ledgerType: 'entry_fee',
 
    amount:   safeAmount,     // in room currency
    currency: roomCurrency,
 
    paymentMethod:  'crypto',
    paymentSource:  'onchain_auto',
    status:         'confirmed',
 
    clubPaymentMethodId,
    paymentReference,
    externalTransactionId,
 
    claimedAt:         now,
    confirmedAt:       now,
    confirmedBy:       'system',
    confirmedByName:   'System',
    confirmedByRole:   'system',
 
    ticketId,
 
    extraMetadata: {
      fundraisingMode:  'donation',
      donationAmount:   safeAmount,
      donationCurrency: roomCurrency,
      autoConfirmed:    true,
 
      source:           'crypto_ticket',
      chain:            'solana',
      network,
      token:            tokenCode,
      cryptoAmount:     cryptoAmount  != null ? String(cryptoAmount)  : null,
      cryptoRawAmount:  cryptoRawAmount != null ? String(cryptoRawAmount) : null,
 
      web3TransactionId,
      senderWallet,
      recipientWallet,
      includedDonationExtras,
 
      paymentMethodLabel:      validatedPaymentMethod.methodLabel,
      paymentProvider:         validatedPaymentMethod.providerName,
      isOfficialClubAccount:   validatedPaymentMethod.isOfficialClubAccount,
    },
  });
 


  // 4. Attach ledger row to ticket
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ?, updated_at = UTC_TIMESTAMP() WHERE ticket_id = ?`,
    [ledgerId, ticketId]
  );

  // 5. Send confirmation email (non-fatal)
  try {
    const { sendTicketConfirmationEmail, getTicketWithRoomConfig } =
      await import('../../utils/ticketEmail.js');
    const ticketRow = await getTicketWithRoomConfig(ticketId);
    if (ticketRow) {
      const config = parseJsonMaybe(ticketRow.config_json, {});
      const extras = parseJsonMaybe(ticketRow.extras, []);
      await sendTicketConfirmationEmail({
        eventTitle:    config?.eventTitle    || null,
  eventLocation: config?.eventLocation || null,
        ticketId,
        purchaserEmail: ticketRow.purchaser_email,
        purchaserName: ticketRow.purchaser_name,
        playerName: ticketRow.player_name,
        entryFee: ticketRow.entry_fee,
        extrasTotal: ticketRow.extras_total,
        totalAmount: ticketRow.total_amount,
        currency: ticketRow.currency,
        currencySymbol: config?.currencySymbol || '€',
        extras,
        clubId: ticketRow.club_id,
        hostName: config?.hostName,
        eventDateTime: config?.eventDateTime,
        timeZone: config?.timeZone,
        gameType: ticketRow.game_type || 'quiz',
        clubName: ticketRow.club_name || null,
      });
      console.log('[TicketService] ✅ Crypto donation email sent to:', ticketRow.purchaser_email);
    }
  } catch (emailErr) {
    console.error('[TicketService] ⚠️ Crypto donation email failed (non-fatal):', emailErr.message);
  }

 
  if (DEBUG) {
    console.log('[TicketService] ✅ Crypto donation ticket created as confirmed/ready:', {
      ticketId, roomId, purchaserName, finalPlayerName,
      safeAmount, roomCurrency, paymentReference,
      web3TransactionId, clubPaymentMethodId,
    });
  }
 
  return {
    ticketId,
    joinToken,
    roomId,
    clubId,
    purchaserName,
    purchaserEmail,
    purchaserPhone,
    playerName:       finalPlayerName,
    entryFee:         safeAmount,
    extrasTotal:      0,
    totalAmount:      safeAmount,
    currency:         roomCurrency,
    extras:           extrasForTicket,
    fundraisingMode:  'donation',
    donationAmount:   safeAmount,
    donationCurrency: roomCurrency,
    paymentStatus:        'payment_confirmed',
    redemptionStatus:     'ready',
    paymentMethod:        'crypto',
    paymentReference,
    externalTransactionId,
    clubPaymentMethodId,
    web3TransactionId,
    ledgerId,
  };
}

/**
 * Host confirms ticket payment
 */
export async function confirmTicketPayment({
  ticketId,
  confirmedBy,
  confirmedByName,
  confirmedByRole,
  adminNotes = null,
}) {
  const ticket = await getTicket(ticketId);

  if (!ticket) throw new Error('Ticket not found');

  if (ticket.payment_status === 'payment_confirmed') {
    throw new Error('Ticket payment already confirmed');
  }

  const sql = `
    UPDATE ${TICKETS_TABLE}
    SET
      payment_status = 'payment_confirmed',
      redemption_status = 'ready',
      confirmed_at = UTC_TIMESTAMP(),
      confirmed_by = ?,
      confirmed_by_name = ?,
      confirmed_by_role = ?,
      admin_notes = ?,
      updated_at = UTC_TIMESTAMP()
    WHERE ticket_id = ?
  `;

  await connection.execute(sql, [
    confirmedBy,
    confirmedByName || null,
    confirmedByRole || null,
    adminNotes,
    ticketId,
  ]);

  const playerId = `ticket_${ticketId}`;
  const { confirmPayment } = await import('./quizPaymentLedgerService.js');

  await confirmPayment({
    roomId: ticket.room_id,
    playerId,
    confirmedBy,
    confirmedByName,
    confirmedByRole,
    adminNotes,
  });

  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket payment confirmed:', {
      ticketId,
      confirmedBy,
      confirmedByName,
    });
  }

  // ✅ Send confirmation email (non-fatal if it fails)
  try {
    const { sendTicketConfirmationEmail, getTicketWithRoomConfig } =
      await import('../../utils/ticketEmail.js');

    const ticketRow = await getTicketWithRoomConfig(ticketId);

    if (ticketRow) {
      const config = parseJsonMaybe(ticketRow.config_json, {});
      const extras = parseJsonMaybe(ticketRow.extras, []);

     await sendTicketConfirmationEmail({
      eventTitle:    config?.eventTitle    || null,
  eventLocation: config?.eventLocation || null,
    ticketId,
    purchaserEmail: ticketRow.purchaser_email,
    purchaserName: ticketRow.purchaser_name,
    playerName: ticketRow.player_name,
    entryFee: ticketRow.entry_fee,
    extrasTotal: ticketRow.extras_total,
    totalAmount: ticketRow.total_amount,
    currency: ticketRow.currency,
    currencySymbol: config?.currencySymbol || '€',
    extras,
    clubId: ticketRow.club_id,
    hostName: config?.hostName,
    eventDateTime: config?.eventDateTime,
    timeZone: config?.timeZone,
    gameType: ticketRow.game_type || 'quiz',     // ← new (from JOIN in getTicketWithRoomConfig)
    clubName: ticketRow.club_name || null,        // ← new (from JOIN in getTicketWithRoomConfig)
  });

      console.log(
        '[TicketService] ✅ Confirmation email sent to:',
        ticketRow.purchaser_email
      );
    }
  } catch (emailErr) {
    console.error(
      '[TicketService] ⚠️ Email send failed (non-fatal):',
      emailErr.message
    );
  }

  return { ok: true, ticketId };
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId) {
  const sql = `SELECT * FROM ${TICKETS_TABLE} WHERE ticket_id = ? LIMIT 1`;
  const [rows] = await connection.execute(sql, [ticketId]);
  return rows?.[0] || null;
}

/**
 * Get ticket by join token
 */
export async function getTicketByToken(joinToken) {
  const sql = `SELECT * FROM ${TICKETS_TABLE} WHERE join_token = ? LIMIT 1`;
  const [rows] = await connection.execute(sql, [joinToken]);
  return rows?.[0] || null;
}

/**
 * Get all tickets for a room
 */
export async function getRoomTickets(roomId) {
  const sql = `
    SELECT * FROM ${TICKETS_TABLE}
    WHERE room_id = ?
    ORDER BY created_at DESC
  `;

  const [rows] = await connection.execute(sql, [roomId]);
  return rows;
}

/**
 * Redeem ticket (use to join room)
 * ✅ Tickets always have priority - they already reserved capacity
 * ✅ Donation tickets now return donationAmount even when extras = []
 */
export async function redeemTicket({ joinToken, playerId }) {
  // 1. Get ticket
  const ticket = await getTicketByToken(joinToken);

  if (!ticket) {
    throw new Error('Invalid ticket token');
  }

  // 2. Validate redemption status
  if (ticket.redemption_status === 'redeemed') {
    throw new Error('Ticket already redeemed');
  }

  if (ticket.redemption_status === 'blocked') {
    throw new Error('Ticket payment not yet confirmed by host');
  }

  if (ticket.redemption_status !== 'ready') {
    throw new Error('Ticket not ready for redemption');
  }

  if (ticket.payment_status !== 'payment_confirmed') {
    throw new Error('Ticket payment is not confirmed');
  }

  /**
   * Load room config so we can correctly identify donation rooms.
   * Do NOT infer donation mode from ticket.extras because Stripe/Revolut
   * donation tickets may have extras = [].
   */
  const roomData = await getRoomConfig(ticket.room_id);
  const isDonationRoom = roomData?.config?.fundraisingMode === 'donation';

  // 3. Mark as redeemed
  const sql = `
    UPDATE ${TICKETS_TABLE}
    SET
      redemption_status = 'redeemed',
      redeemed_at = UTC_TIMESTAMP(),
      redeemed_by_player_id = ?,
      updated_at = UTC_TIMESTAMP()
    WHERE ticket_id = ?
  `;

  await connection.execute(sql, [playerId, ticket.ticket_id]);

  // 4. Update ledger entries to link to real player ID
  const tempPlayerId = `ticket_${ticket.ticket_id}`;

  await connection.execute(
    `
    UPDATE ${TABLE_PREFIX}quiz_payment_ledger
    SET player_id = ?, player_name = ?, updated_at = UTC_TIMESTAMP()
    WHERE room_id = ? AND player_id = ?
    `,
    [playerId, ticket.player_name, ticket.room_id, tempPlayerId]
  );

  // 5. Return ticket data for player join
  const extras = parseJsonMaybe(ticket.extras, []);

  const entryFee = Number(ticket.entry_fee || 0);
  const extrasTotal = Number(ticket.extras_total || 0);
  const totalAmount = Number(ticket.total_amount || entryFee + extrasTotal || 0);

  const donationAmount = isDonationRoom ? entryFee : null;

  const extraIds = Array.isArray(extras)
    ? extras
        .map((extra) => {
          if (typeof extra === 'string') return extra;
          return extra?.extraId;
        })
        .filter(Boolean)
    : [];

  const extraPayments = Object.fromEntries(
    Array.isArray(extras)
      ? extras
          .filter((extra) => {
            if (typeof extra === 'string') return !!extra;
            return !!extra?.extraId;
          })
          .map((extra) => {
            const extraId = typeof extra === 'string' ? extra : extra.extraId;
            const amount =
              typeof extra === 'string' ? 0 : Number(extra.price || 0);

            return [
              extraId,
              {
                method: ticket.payment_method,
                amount,
                clubPaymentMethodId: ticket.club_payment_method_id || null,
              },
            ];
          })
      : []
  );

  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket redeemed:', {
      ticketId: ticket.ticket_id,
      playerId,
      playerName: ticket.player_name,
      roomId: ticket.room_id,
      isDonationRoom,
      paymentMethod: ticket.payment_method,
      entryFee,
      extrasTotal,
      totalAmount,
      donationAmount,
      currency: ticket.currency,
      paymentReference: ticket.payment_reference,
      clubPaymentMethodId: ticket.club_payment_method_id,
      externalTransactionId: ticket.external_transaction_id,
      extras: extraIds,
      extraPayments,
    });
  }

  return {
    ticketId: ticket.ticket_id,
    roomId: ticket.room_id,
    playerName: ticket.player_name,

    entryFee,
    extrasTotal,
    totalAmount,
    currency: ticket.currency || 'EUR',

    donationAmount,

    extras: extraIds,
    extraPayments,

    paymentMethod: ticket.payment_method,
    paymentReference: ticket.payment_reference || null,
    clubPaymentMethodId: ticket.club_payment_method_id || null,
    externalTransactionId: ticket.external_transaction_id || null,

    paymentClaimed: true,
    paymentConfirmedBy: ticket.confirmed_by || 'ticket_system',
    paymentConfirmedByName: ticket.confirmed_by_name || 'System',
    paymentConfirmedRole: ticket.confirmed_by_role || 'system',
    paymentConfirmedAt: ticket.confirmed_at || null,

    paid: true,
  };
}

export async function getRoomSchedule(roomId) {
  const sql = `
    SELECT room_id, status, scheduled_at, time_zone
    FROM ${WEB2_ROOMS_TABLE}
    WHERE room_id = ?
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [roomId]);
  return rows?.[0] || null;
}

// configurable join window
export const JOIN_WINDOW_MINUTES = 10;

export function computeJoinWindow(roomRow) {
  const scheduledAt = parseMysqlUtcDateTime(roomRow?.scheduled_at);
  const roomStatus = roomRow?.status || null;

  const isRoomBlocked =
    roomStatus === 'completed' || roomStatus === 'cancelled';

  // ✅ Gate is now status-driven only:
  // 'open' = lobby is open, tickets redeemable
  // 'live' = game running, still joinable
  const canJoinNow =
    !isRoomBlocked && (roomStatus === 'open' || roomStatus === 'live');

  // joinOpensAt is kept so the frontend can still show a countdown
  // to the scheduled time, but it NO LONGER controls the join gate.
  const joinOpensAt = scheduledAt
    ? new Date(scheduledAt.getTime() - JOIN_WINDOW_MINUTES * 60 * 1000)
    : null;

  return {
    roomStatus,
    scheduledAt,
    joinOpensAt,
    canJoinNow,
  };
}

// Existing Stripe helper kept for compatibility.
// NOTE: Your router currently uses ../../stripe/stripeTicketCheckoutService.js,
// not this function. If you still use this function elsewhere, it should also
// be updated to validate that Stripe is linked to the quiz.
export async function createTicketStripeCheckout({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
  selectedExtras = [],
  appOrigin,
}) {
  const capacityCheck = await canPurchaseTickets(roomId, 1);

  if (!capacityCheck.allowed) {
    throw new Error(capacityCheck.reason);
  }

  const roomData = await getRoomConfig(roomId);

  if (!roomData) {
    throw new Error('Room not found or not available for ticket purchase');
  }

  const { clubId, config } = roomData;

  const entryFee = parseFloat(config.entryFee || 0);

  const currency =
    config.currencySymbol === '€'
      ? 'EUR'
      : config.currencySymbol === '£'
        ? 'GBP'
        : config.currencySymbol === '$'
          ? 'USD'
          : 'EUR';

  let extrasTotal = 0;
  const extrasWithPrices = [];

  for (const extraId of selectedExtras) {
    const price = config.fundraisingPrices?.[extraId] || 0;

    if (price > 0) {
      extrasTotal += price;
      extrasWithPrices.push({ extraId, price });
    }
  }

  const totalAmount = entryFee + extrasTotal;
  const totalAmountCents = Math.round(totalAmount * 100);

  const stripeConn = await getEnabledReadyStripeForClub(clubId);

  if (!stripeConn?.accountId) {
    throw new Error('stripe_not_ready_or_disabled');
  }

  const ticketId = nanoid(12);
  const joinToken = nanoid(16);

  await connection.execute(
    `
    INSERT INTO ${TICKETS_TABLE}
      (
        ticket_id,
        room_id,
        club_id,
        purchaser_name,
        purchaser_email,
        purchaser_phone,
        player_name,
        entry_fee,
        extras,
        extras_total,
        total_amount,
        currency,
        payment_status,
        payment_method,
        payment_reference,
        club_payment_method_id,
        redemption_status,
        join_token
      )
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_claimed', 'stripe', NULL, ?, 'blocked', ?)
    `,
    [
      ticketId,
      roomId,
      clubId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName || purchaserName,
      entryFee,
      JSON.stringify(extrasWithPrices),
      extrasTotal,
      totalAmount,
      currency,
      stripeConn.clubPaymentMethodId,
      joinToken,
    ]
  );

  const tempPlayerId = `ticket_${ticketId}`;

  const entryLedgerId = await createExpectedPayment({
    roomId,
    clubId,
    playerId: tempPlayerId,
    playerName: playerName || purchaserName,
    ledgerType: 'entry_fee',
    amount: entryFee,
    currency,
    paymentMethod: 'stripe',
    paymentSource: 'player_selected',
    clubPaymentMethodId: stripeConn.clubPaymentMethodId,
    ticketId,
    status: 'expected',
  });

  for (const extra of extrasWithPrices) {
    await createExpectedPayment({
      roomId,
      clubId,
      playerId: tempPlayerId,
      playerName: playerName || purchaserName,
      ledgerType: 'extra_purchase',
      amount: extra.price,
      currency,
      paymentMethod: 'stripe',
      paymentSource: 'player_selected',
      clubPaymentMethodId: stripeConn.clubPaymentMethodId,
      ticketId,
      status: 'expected',
      extraId: extra.extraId,
      extraMetadata: extra,
    });
  }

  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [entryLedgerId, ticketId]
  );

  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: totalAmountCents,
            product_data: { name: `Quiz Ticket (${roomId})` },
          },
        },
      ],
      success_url: `${origin}/quiz/${roomId}/tickets/success?ticketId=${ticketId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/quiz/${roomId}/tickets/cancel?ticketId=${ticketId}&session_id={CHECKOUT_SESSION_ID}`,

      metadata: {
        type: 'ticket_purchase',
        ticketId,
        roomId,
        clubId,
        tempPlayerId,
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  await connection.execute(
    `
    UPDATE ${TICKETS_TABLE}
    SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
    WHERE ticket_id = ?
    `,
    [session.id, ticketId]
  );

  await connection.execute(
    `
    UPDATE ${TABLE_PREFIX}quiz_payment_ledger
    SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
    WHERE ticket_id = ?
    `,
    [session.id, ticketId]
  );

  return {
    url: session.url,
    ticketId,
    joinToken,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 2: PATCH for server/quiz/services/quizTicketService.js
//
// ADD this function after createCryptoDonationTicketWithConfirmedPayment.
// Also ADD this import at the top of the file (alongside currencyFromSymbol):
//   import { currencyFromSymbol } from '../../utils/currencyUtils.js';
// (already present from previous patch)
// ─────────────────────────────────────────────────────────────────────────────

// REPLACE the createCryptoFixedFeeTicketWithConfirmedPayment function
// in server/quiz/services/quizTicketService.js with this full version.

export async function createCryptoFixedFeeTicketWithConfirmedPayment({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,

  entryFeeFiat,        // fiat value of entry fee in room currency
  extrasFiat = 0,      // fiat value of extras in room currency
  totalFiat,           // entryFeeFiat + extrasFiat
  currency,            // ISO code e.g. 'EUR'

  selectedExtras = [],

  clubPaymentMethodId,
  paymentReference,
  externalTransactionId,
  web3TransactionId = null,

  tokenCode = null,          // e.g. 'SOL'
  cryptoDisplayAmount = null, // e.g. 0.034521 — the SOL amount sent
  entryFeeDisplay = null,    // fiat entry fee (for metadata)
  extrasDisplay = null,      // fiat extras (for metadata)
  entryFeeRaw = null,        // raw lamports entry portion
  extrasRaw = null,          // raw lamports extras portion
  network = 'mainnet',
  senderWallet = null,
  recipientWallet = null,
}) {
  // 0. Capacity check
  const capacityCheck = await canPurchaseTickets(roomId, 1);
  if (!capacityCheck.allowed) throw new Error(capacityCheck.reason);

  // 1. Room config
  const roomData = await getRoomConfig(roomId);
  if (!roomData) throw new Error('Room not found or not available for ticket purchase');

  const { clubId, config, linkedPaymentMethods } = roomData;

  const validatedPaymentMethod = await validateCryptoTicketPaymentMethod({
    roomId, clubId, linkedPaymentMethods, clubPaymentMethodId,
  });
  clubPaymentMethodId = validatedPaymentMethod.id;

  const isDonationRoom = config?.fundraisingMode === 'donation';
  if (isDonationRoom) throw new Error('Use createCryptoDonationTicketWithConfirmedPayment for donation rooms');

  // Room config is source of truth for currency
  const roomCurrency = currencyFromSymbol(config.currencySymbol) || currency || 'EUR';

  const safeEntryFee = Number(entryFeeFiat) || 0;
  const safeExtras   = Number(extrasFiat)   || 0;
  const safeTotal    = Number(totalFiat)    || (safeEntryFee + safeExtras);

  if (!paymentReference || !externalTransactionId)
    throw new Error('paymentReference and externalTransactionId are required');

  // Build extras array — include token info for reconciliation
  const extrasForTicket = Array.isArray(selectedExtras)
    ? selectedExtras.map((extraId) => ({
        extraId,
        price:              safeExtras / Math.max(selectedExtras.length, 1),
        source:             'crypto_fixed_fee',
        token:              tokenCode,                          // ← SOL / BONK etc.
        cryptoDisplayAmount: cryptoDisplayAmount != null
          ? String(cryptoDisplayAmount)
          : null,
      }))
    : [];

  const ticketId        = nanoid(12);
  const joinToken       = nanoid(16);
  const tempPlayerId    = `ticket_${ticketId}`;
  const finalPlayerName = playerName || purchaserName;
  const now             = new Date();

  // 2. Insert ticket as confirmed and ready
  const ticketSql = `
    INSERT INTO ${TICKETS_TABLE}
      (
        ticket_id, room_id, club_id,
        purchaser_name, purchaser_email, purchaser_phone, player_name,
        entry_fee, extras, extras_total, total_amount, currency,
        payment_status, payment_method, payment_reference, club_payment_method_id,
        redemption_status, join_token,
        confirmed_at, confirmed_by, confirmed_by_name, confirmed_by_role,
        created_at, updated_at
      )
    VALUES
      (
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'payment_confirmed', 'crypto', ?, ?,
        'ready', ?,
        UTC_TIMESTAMP(), 'system', 'System', 'system',
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
      )
  `;

  await connection.execute(ticketSql, [
    ticketId, roomId, clubId,
    purchaserName, purchaserEmail, purchaserPhone, finalPlayerName,
    safeEntryFee,
    JSON.stringify(extrasForTicket),
    safeExtras,
    safeTotal,
    roomCurrency,
    paymentReference,
    clubPaymentMethodId,
    joinToken,
  ]);

  // 3. Entry fee ledger row
  const ledgerId = await createExpectedPayment({
    roomId,
    clubId,
    playerId:              tempPlayerId,
    playerName:            finalPlayerName,
    ledgerType:            'entry_fee',
    amount:                safeEntryFee,
    currency:              roomCurrency,
    paymentMethod:         'crypto',
    paymentSource:         'onchain_auto',
    status:                'confirmed',
    clubPaymentMethodId,
    paymentReference,
    externalTransactionId,
    claimedAt:             now,
    confirmedAt:           now,
    confirmedBy:           'system',
    confirmedByName:       'System',
    confirmedByRole:       'system',
    ticketId,
    extraMetadata: {
      fundraisingMode:       'fixed_fee',
      autoConfirmed:         true,
      source:                'crypto_ticket',
      chain:                 'solana',
      network,
      token:                 tokenCode,
      cryptoAmount:          cryptoDisplayAmount != null ? String(cryptoDisplayAmount) : null,
      cryptoRawAmount:       entryFeeRaw != null ? String(entryFeeRaw) : null,
      entryFeeFiat:          safeEntryFee,
      web3TransactionId,
      senderWallet,
      recipientWallet,
      selectedExtras,
      paymentMethodLabel:    validatedPaymentMethod.methodLabel,
      paymentProvider:       validatedPaymentMethod.providerName,
      isOfficialClubAccount: validatedPaymentMethod.isOfficialClubAccount,
    },
  });

  // 4. Extras ledger rows
  for (const extra of extrasForTicket) {
    if (extra.price > 0) {
      await createExpectedPayment({
        roomId,
        clubId,
        playerId:              tempPlayerId,
        playerName:            finalPlayerName,
        ledgerType:            'extra_purchase',
        amount:                extra.price,
        currency:              roomCurrency,
        paymentMethod:         'crypto',
        paymentSource:         'onchain_auto',
        status:                'confirmed',
        clubPaymentMethodId,
        paymentReference,
        externalTransactionId,
        claimedAt:             now,
        confirmedAt:           now,
        confirmedBy:           'system',
        confirmedByName:       'System',
        confirmedByRole:       'system',
        extraId:               extra.extraId,
        ticketId,
        extraMetadata: {
          extraId:             extra.extraId,
          price:               extra.price,
          source:              'crypto_fixed_fee',
          token:               tokenCode,
          cryptoAmount:        cryptoDisplayAmount != null ? String(cryptoDisplayAmount) : null,
          cryptoRawAmount:     extrasRaw != null ? String(extrasRaw) : null,
          web3TransactionId,
        },
      });
    }
  }


 // 5. Attach ledger to ticket
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ?, updated_at = UTC_TIMESTAMP() WHERE ticket_id = ?`,
    [ledgerId, ticketId]
  );

  // 6. Send confirmation email (non-fatal)
  try {
    const { sendTicketConfirmationEmail, getTicketWithRoomConfig } =
      await import('../../utils/ticketEmail.js');
    const ticketRow = await getTicketWithRoomConfig(ticketId);
    if (ticketRow) {
      const config = parseJsonMaybe(ticketRow.config_json, {});
      const extras = parseJsonMaybe(ticketRow.extras, []);
      await sendTicketConfirmationEmail({
        eventTitle:    config?.eventTitle    || null,
  eventLocation: config?.eventLocation || null,
        ticketId,
        purchaserEmail: ticketRow.purchaser_email,
        purchaserName: ticketRow.purchaser_name,
        playerName: ticketRow.player_name,
        entryFee: ticketRow.entry_fee,
        extrasTotal: ticketRow.extras_total,
        totalAmount: ticketRow.total_amount,
        currency: ticketRow.currency,
        currencySymbol: config?.currencySymbol || '€',
        extras,
        clubId: ticketRow.club_id,
        hostName: config?.hostName,
        eventDateTime: config?.eventDateTime,
        timeZone: config?.timeZone,
        gameType: ticketRow.game_type || 'quiz',
        clubName: ticketRow.club_name || null,
      });
      console.log('[TicketService] ✅ Crypto fixed-fee email sent to:', ticketRow.purchaser_email);
    }
  } catch (emailErr) {
    console.error('[TicketService] ⚠️ Crypto fixed-fee email failed (non-fatal):', emailErr.message);
  }

  if (DEBUG) {
    console.log('[TicketService] ✅ Crypto fixed-fee ticket created:', {
      ticketId, roomId, purchaserName, finalPlayerName,
      safeEntryFee, safeExtras, safeTotal, roomCurrency,
      tokenCode, cryptoDisplayAmount,
    });
  }

  return {
    ticketId,
    joinToken,
    roomId,
    clubId,
    purchaserName,
    purchaserEmail,
    purchaserPhone,
    playerName:           finalPlayerName,
    entryFee:             safeEntryFee,
    extrasTotal:          safeExtras,
    totalAmount:          safeTotal,
    currency:             roomCurrency,
    extras:               extrasForTicket,
    fundraisingMode:      'fixed_fee',
    paymentStatus:        'payment_confirmed',
    redemptionStatus:     'ready',
    paymentMethod:        'crypto',
    paymentReference,
    externalTransactionId,
    clubPaymentMethodId,
    web3TransactionId,
    ledgerId,
  };
}
