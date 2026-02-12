// server/quiz/services/quizTicketService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createExpectedPayment } from './quizPaymentLedgerService.js';

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

const DEBUG = true;

/**
 * Get room configuration from database
 * Returns null if room not found or is Web3
 */
export async function getRoomConfig(roomId) {
  const sql = `
    SELECT 
      room_id,
      club_id,
      config_json,
      status
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
  
  const config = typeof row.config_json === 'string' 
    ? JSON.parse(row.config_json) 
    : row.config_json;
  
  // ✅ Block Web3 rooms
  if (config.paymentMethod === 'web3' || config.isWeb3Room === true) {
    if (DEBUG) console.log('[TicketService] ❌ Web3 room - tickets not supported:', roomId);
    return null;
  }
  
  return {
    roomId: row.room_id,
    clubId: row.club_id,
    status: row.status,
    config,
  };
}

/**
 * Create ticket with payment claim in ONE STEP
 * Only writes to DB when user confirms they've paid
 * Prevents abandoned "pending_payment" tickets
 */
export async function createTicketWithPayment({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
  selectedExtras = [],
  paymentMethod,
  paymentReference,
  clubPaymentMethodId = null,
}) {
  // 1. Get room config
  const roomData = await getRoomConfig(roomId);
  
  if (!roomData) {
    throw new Error('Room not found or not available for ticket purchase');
  }
  
  const { clubId, config } = roomData;
  
  // 2. Calculate pricing
  const entryFee = parseFloat(config.entryFee || 0);
  const currency = config.currencySymbol === '€' ? 'EUR' 
                 : config.currencySymbol === '£' ? 'GBP' 
                 : config.currencySymbol === '$' ? 'USD'
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
  
  // 3. Generate unique IDs
  const ticketId = nanoid(12);
  const joinToken = nanoid(16);
  
  // 4. Insert ticket WITH payment claimed (skips pending_payment)
  const sql = `
    INSERT INTO ${TICKETS_TABLE}
      (ticket_id, room_id, club_id, purchaser_name, purchaser_email, purchaser_phone,
       player_name, entry_fee, extras, extras_total, total_amount, currency,
       payment_status, payment_method, payment_reference, club_payment_method_id,
       redemption_status, join_token)
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
    playerName || purchaserName, // Default player name to purchaser name
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
  
  const [result] = await connection.execute(sql, params);
  
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
    ticketId: ticketId,
  });
  
  // 6. Create ledger entries (extras)
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
      extraMetadata: extra,
      ticketId: ticketId,
    });
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
    paymentStatus: 'payment_claimed',
    redemptionStatus: 'blocked',
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
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
  // 1. Get ticket
  const ticket = await getTicket(ticketId);
  
  if (!ticket) {
    throw new Error('Ticket not found');
  }
  
  if (ticket.payment_status === 'payment_confirmed') {
    throw new Error('Ticket payment already confirmed');
  }
  
  // 2. Update ticket
  const sql = `
    UPDATE ${TICKETS_TABLE}
  SET
    payment_status = 'payment_confirmed',
    redemption_status = 'ready',
    confirmed_at = NOW(),
    confirmed_by = ?,
    confirmed_by_name = ?,
    confirmed_by_role = ?,
    admin_notes = ?,
    updated_at = NOW()
  WHERE ticket_id = ?
`;
  
await connection.execute(sql, [
  confirmedBy,
  confirmedByName || null,
  confirmedByRole || null,
  adminNotes,
  ticketId
]);
  
  // 3. Update ledger entries
  const playerId = `ticket_${ticketId}`;
  
  // Import confirmPayment from ledger service
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
 */
export async function redeemTicket({
  joinToken,
  playerId,
}) {
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
  
  // 3. Mark as redeemed
  const sql = `
    UPDATE ${TICKETS_TABLE}
    SET
      redemption_status = 'redeemed',
      redeemed_at = NOW(),
      redeemed_by_player_id = ?,
      updated_at = NOW()
    WHERE ticket_id = ?
  `;
  
  await connection.execute(sql, [playerId, ticket.ticket_id]);
  
  // 4. Update ledger entries to link to real player ID
  const tempPlayerId = `ticket_${ticket.ticket_id}`;
  
  await connection.execute(
    `UPDATE ${TABLE_PREFIX}quiz_payment_ledger 
     SET player_id = ?, player_name = ? 
     WHERE room_id = ? AND player_id = ?`,
    [playerId, ticket.player_name, ticket.room_id, tempPlayerId]
  );
  
  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket redeemed:', {
      ticketId: ticket.ticket_id,
      playerId,
      playerName: ticket.player_name,
    });
  }
  
  // 5. Return ticket data for player join
  const extras = typeof ticket.extras === 'string' 
    ? JSON.parse(ticket.extras) 
    : ticket.extras || [];
  
  return {
    ticketId: ticket.ticket_id,
    roomId: ticket.room_id,
    playerName: ticket.player_name,
    entryFee: parseFloat(ticket.entry_fee),
    extras: extras.map(e => e.extraId),
    extraPayments: Object.fromEntries(
      extras.map(e => [e.extraId, {
        method: ticket.payment_method,
        amount: e.price,
      }])
    ),
    paymentMethod: ticket.payment_method,
    paid: true, // Always true for confirmed tickets
  };
}

// server/quiz/services/quizTicketService.js

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

// In computeJoinWindow function
export function computeJoinWindow(roomRow) {
  const scheduledAt = roomRow?.scheduled_at ? new Date(roomRow.scheduled_at) : null;
  const joinOpensAt = scheduledAt
    ? new Date(scheduledAt.getTime() - JOIN_WINDOW_MINUTES * 60 * 1000)
    : null;

  const now = new Date();
  const roomStatus = roomRow?.status || null;

  // ✅ FIX: Allow join if time window is open OR room is live
  const canJoinByTime = !!joinOpensAt && now.getTime() >= joinOpensAt.getTime();
  const canJoinByStatus = roomStatus === 'live';
  
  // ✅ Block only if room is completed/cancelled
  const isRoomBlocked = roomStatus === 'completed' || roomStatus === 'cancelled';
  
  const canJoinNow = !isRoomBlocked && (canJoinByTime || canJoinByStatus);

  return {
    roomStatus,
    scheduledAt,
    joinOpensAt,
    canJoinNow,
  };
}
