// server/quiz/services/quizCapacityService.js

import { connection, TABLE_PREFIX } from '../../config/database.js';

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

const DEBUG = false;

/**
 * Get the current in-memory player count for the correct game engine.
 *
 * Quiz rooms live in quizRoomManager.
 * Elimination rooms live in eliminationRoomManager.
 *
 * Ticketed events don't use either game room manager for capacity here.
 */
async function getCurrentPlayersInRoom(roomId, gameType) {
  try {
if (gameType === 'elimination') {
  const { getRoom } =
    await import('../../elimination/services/eliminationRoomManager.js');

  const room = getRoom(roomId);

  const playerCount =
    room
      ? Object.keys(room.players || {}).length
      : 0;

  console.log('🧮 [Capacity] ELIMINATION MEMORY CHECK', {
    roomId,
    roomFound: !!room,
    roomStatus: room?.status ?? null,
    playerCount,
    players: room
      ? Object.values(room.players || {}).map((p) => ({
          playerId: p.playerId,
          name: p.name,
          addedByHost: p.addedByHost ?? false,
          connected: p.connected ?? false,
        }))
      : [],
  });

  return playerCount;
}

    if (gameType === 'quiz') {
      const { getQuizRoom } =
        await import('../../quiz/quizRoomManager.js');

      const room = getQuizRoom(roomId);

      return room
        ? Object.keys(room.players || {}).length
        : 0;
    }

    return 0;

  } catch (err) {
    console.error(
      `[Capacity] Failed to read in-memory players for ${gameType} room ${roomId}:`,
      err.message
    );

    return 0;
  }
}

/**
 * Get comprehensive capacity status for a room
 *
 * Priority Logic:
 * 1. Tickets reserve capacity immediately when purchased (payment_claimed or payment_confirmed)
 * 2. Walk-ins can only fill spots NOT reserved by tickets
 * 3. Redeemed tickets don't double-count (they're in both tickets and players)
 *
 * @param {string} roomId - Quiz room ID
 * @param {number} currentPlayersInRoom - Count from quizRoomManager (optional, for join-time check)
 * @returns {Promise<Object>} Capacity status
 */
export async function getRoomCapacityStatus(
  roomId,
  suppliedPlayerCount = null
) {
  try {
    // 1. Get room configuration and max capacity
const roomSql = `
  SELECT
    room_caps_json,
    config_json,
    status,
    game_type,
    scheduled_at
  FROM ${WEB2_ROOMS_TABLE}
  WHERE room_id = ?
  LIMIT 1
`;

    const [roomRows] = await connection.execute(roomSql, [roomId]);
    const roomRow = roomRows?.[0];

    if (!roomRow) {
      throw new Error(`Room ${roomId} not found`);
    }

    // Parse room caps
    const roomCaps = typeof roomRow.room_caps_json === 'string'
      ? JSON.parse(roomRow.room_caps_json)
      : roomRow.room_caps_json || {};

    const config = typeof roomRow.config_json === 'string'
      ? JSON.parse(roomRow.config_json)
      : roomRow.config_json || {};

    const gameType = roomRow.game_type || 'quiz';
    const isTicketedEvent = gameType === 'ticketed_event';
    const currentPlayersInRoom =
  suppliedPlayerCount !== null &&
  suppliedPlayerCount !== undefined
    ? Number(suppliedPlayerCount)
    : await getCurrentPlayersInRoom(roomId, gameType);

    console.log('🧮 [Capacity] ROOM INPUT', {
  roomId,
  gameType,
  roomDbStatus: roomRow.status,
  suppliedPlayerCount,
  currentPlayersInRoom,
});

   const venueCapacity =
  roomCaps.venueCapacity         ||
  config.roomCaps?.venueCapacity ||
  null;

const planMaxPlayers =
  roomCaps.maxPlayers         ||
  config.roomCaps?.maxPlayers ||
  config.maxPlayers           ||
  20;

// Ticketed events: venue capacity is the hard ceiling (host-defined).
// Quiz/elimination: plan-based maxPlayers applies.
const maxCapacity = isTicketedEvent && venueCapacity
  ? venueCapacity
  : planMaxPlayers;

    if (DEBUG) {
      console.log('[Capacity] Room caps loaded:', {
        roomId,
        maxCapacity,
        gameType,
        fromRoomCaps: !!roomCaps.maxPlayers,
        fromConfig: !!config.roomCaps?.maxPlayers,
      });
    }

    // 2. Count tickets that reserve capacity
    const ticketSql = `
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN redemption_status = 'redeemed' THEN 1 ELSE 0 END) as redeemed_tickets,
        SUM(CASE WHEN payment_status = 'payment_claimed' THEN 1 ELSE 0 END) as claimed_tickets,
        SUM(CASE WHEN payment_status = 'payment_confirmed' THEN 1 ELSE 0 END) as confirmed_tickets
      FROM ${TICKETS_TABLE}
      WHERE room_id = ?
        AND payment_status IN ('payment_claimed', 'payment_confirmed')
      LIMIT 1
    `;

    const [ticketRows] = await connection.execute(ticketSql, [roomId]);
    const ticketStats = ticketRows?.[0] || {};

    const totalTickets     = Number(ticketStats.total_tickets    || 0);
    const redeemedTickets  = Number(ticketStats.redeemed_tickets || 0);
    const claimedTickets   = Number(ticketStats.claimed_tickets  || 0);
    const confirmedTickets = Number(ticketStats.confirmed_tickets || 0);

    // 3. Calculate capacity usage
// ── Capacity calculation ─────────────────────────────────────────────────
//
// Every sold/claimed/confirmed ticket reserves one place.
//
// Players currently in the room who have redeemed a ticket are already
// represented in totalTickets, so remove redeemed ticket holders from
// the in-memory player count to avoid double-counting them.
//
// Anything left in the in-memory count is a genuine walk-in / host-added
// player and also consumes capacity.

const reservedByTickets =
  totalTickets;

const walkInPlayers =
  Math.max(
    0,
    currentPlayersInRoom - redeemedTickets
  );

const totalUsed =
  reservedByTickets + walkInPlayers;

const availableTotal =
  Math.max(
    0,
    maxCapacity - totalUsed
  );

// A new ticket purchase can only use genuinely unused capacity.
const availableForTickets =
  availableTotal;

// A new walk-in can also only use genuinely unused capacity.
const availableForWalkIns =
  availableTotal;

const isFull =
  totalUsed >= maxCapacity;

// Keep this as a useful informational flag:
// every place has been reserved specifically by tickets.
const ticketsFull =
  reservedByTickets >= maxCapacity;

  console.log('🧮 [Capacity] FINAL CALCULATION', {
  roomId,
  gameType,
  maxCapacity,

  totalTickets,
  redeemedTickets,

  currentPlayersInRoom,
  walkInPlayers,

  reservedByTickets,
  totalUsed,

  availableTotal,
  availableForTickets,
  availableForWalkIns,

  isFull,
  ticketsFull,
});

// ── Ticket sales rules ───────────────────────────────────────────────────
//
// Quiz / Elimination:
//   scheduled → OPEN
//   open      → OPEN
//   live      → CLOSED - game has started
//   completed → CLOSED
//   cancelled → CLOSED
//
// Ticketed Event:
//   scheduled → OPEN
//   open      → OPEN
//   completed → CLOSED
//   cancelled → CLOSED
//
// There is deliberately NO scheduled-time cutoff.

let ticketSalesOpen = true;
let ticketSalesCloseReason = null;

if (isTicketedEvent) {
  ticketSalesOpen =
    roomRow.status === 'scheduled' ||
    roomRow.status === 'open';

  if (!ticketSalesOpen) {
    if (roomRow.status === 'completed') {
      ticketSalesCloseReason = 'Event is completed';
    } else if (roomRow.status === 'cancelled') {
      ticketSalesCloseReason = 'Event is cancelled';
    } else {
      ticketSalesCloseReason = 'Ticket sales are closed';
    }
  }

} else {
  // Quiz + Elimination
  ticketSalesOpen =
    roomRow.status === 'scheduled' ||
    roomRow.status === 'open';

  if (!ticketSalesOpen) {
    if (roomRow.status === 'live') {
      ticketSalesCloseReason =
        'Ticket sales closed - game has started';

    } else if (roomRow.status === 'completed') {
      ticketSalesCloseReason =
        'Ticket sales closed - game has ended';

    } else if (roomRow.status === 'cancelled') {
      ticketSalesCloseReason =
        'Ticket sales closed - game was cancelled';

    } else {
      ticketSalesCloseReason =
        'Ticket sales are closed';
    }
  }
}

 // Capacity always overrides everything.
// The room may be full because of tickets, host/admin-added players,
// or a combination of both.
if (isFull) {
  ticketSalesOpen = false;
  ticketSalesCloseReason = 'SOLD OUT - Maximum capacity reached';
}

    const result = {
      roomId,
      maxCapacity,

      // Ticket stats
      totalTickets,
      claimedTickets,
      confirmedTickets,
      redeemedTickets,
      reservedByTickets,

      // Player stats
      currentPlayersInRoom,
      walkInPlayers,

      // Capacity analysis
      totalUsed,
      availableTotal,
      availableForTickets,
      availableForWalkIns,

      // Status flags
      isFull,
      ticketsFull,
      ticketSalesOpen,
      ticketSalesCloseReason,

      // Metadata
      roomStatus: roomRow.status,
      scheduledAt: roomRow.scheduled_at,
      gameType,
    };

    if (DEBUG) {
      console.log('[Capacity] Status calculated:', result);
    }

    return result;

  } catch (error) {
    console.error('[Capacity] ❌ Error getting capacity status:', error);
    throw error;
  }
}

/**
 * Check if a ticket purchase would exceed capacity
 * Called BEFORE creating ticket
 *
 * @param {string} roomId - Quiz room ID
 * @param {number} quantity - Number of tickets to purchase (default 1)
 * @returns {Promise<Object>} { allowed: boolean, reason?: string, capacity: Object }
 */
export async function canPurchaseTickets(roomId, quantity = 1) {
  try {
 const capacity =
  await getRoomCapacityStatus(roomId);

    if (!capacity.ticketSalesOpen) {
      return {
        allowed: false,
        reason: capacity.ticketSalesCloseReason || 'Ticket sales are closed',
        capacity,
      };
    }

    if (capacity.availableForTickets < quantity) {
      return {
        allowed: false,
        reason: `Only ${capacity.availableForTickets} spot${capacity.availableForTickets === 1 ? '' : 's'} remaining (requesting ${quantity})`,
        capacity,
      };
    }

    return {
      allowed: true,
      capacity,
    };

  } catch (error) {
    console.error('[Capacity] ❌ Error checking ticket purchase:', error);
    throw error;
  }
}

/**
 * Check if a walk-in player can join the room
 * Called when player tries to join WITHOUT a ticket
 *
 * @param {string} roomId - Quiz room ID
 * @param {number} currentPlayersInRoom - Current player count from quizRoomManager
 * @returns {Promise<Object>} { allowed: boolean, reason?: string, capacity: Object }
 */
export async function canJoinAsWalkIn(roomId, currentPlayersInRoom) {
  try {
    const capacity = await getRoomCapacityStatus(roomId, currentPlayersInRoom);

    if (capacity.isFull) {
      return {
        allowed: false,
        reason: `Room is full (${capacity.maxCapacity} players maximum)`,
        capacity,
      };
    }

    if (capacity.availableForWalkIns < 1) {
      return {
        allowed: false,
        reason: `Room is full - all remaining spots are reserved for ticket holders`,
        capacity,
      };
    }

    return {
      allowed: true,
      capacity,
    };

  } catch (error) {
    console.error('[Capacity] ❌ Error checking walk-in join:', error);
    throw error;
  }
}

/**
 * Check if a ticket can be redeemed
 * Called when player with ticket tries to join
 *
 * @param {string} roomId - Quiz room ID
 * @param {string} ticketId - Ticket ID
 * @param {number} currentPlayersInRoom - Current player count from quizRoomManager
 * @returns {Promise<Object>} { allowed: boolean, reason?: string, capacity: Object }
 */
export async function canRedeemTicket(roomId, ticketId, currentPlayersInRoom) {
  try {
    const capacity = await getRoomCapacityStatus(roomId, currentPlayersInRoom);

    return {
      allowed: true,
      reason: 'Ticket holder has reserved capacity',
      capacity,
    };

  } catch (error) {
    console.error('[Capacity] ❌ Error checking ticket redemption:', error);
    throw error;
  }
}

/**
 * Get user-friendly capacity message for display
 *
 * @param {Object} capacity - Capacity status object
 * @returns {string} Human-readable message
 */
export function getCapacityMessage(capacity) {
  const eventNoun = capacity.gameType === 'ticketed_event' ? 'event' : 'quiz';
  const eventNounCap = eventNoun.charAt(0).toUpperCase() + eventNoun.slice(1);

  if (capacity.isFull) {
    return `SOLD OUT - This ${eventNoun} is at maximum capacity (${capacity.maxCapacity} players)`;
  }

  if (capacity.ticketsFull) {
    return `SOLD OUT - All ${capacity.maxCapacity} spots are reserved by ticket holders`;
  }

  if (!capacity.ticketSalesOpen && capacity.ticketSalesCloseReason) {
    return capacity.ticketSalesCloseReason;
  }

  if (capacity.availableForTickets > 0) {
    const remaining = capacity.availableForTickets;
    return `${remaining} spot${remaining === 1 ? '' : 's'} remaining`;
  }

  if (capacity.availableForWalkIns > 0) {
    const remaining = capacity.availableForWalkIns;
    return `${remaining} walk-in spot${remaining === 1 ? '' : 's'} remaining (tickets sold out)`;
  }

  return 'Capacity information unavailable';
}