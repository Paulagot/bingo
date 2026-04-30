// server/quiz/services/quizCapacityService.js

import { connection, TABLE_PREFIX } from '../../config/database.js';

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

const DEBUG = false;

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
export async function getRoomCapacityStatus(roomId, currentPlayersInRoom = 0) {
  try {
    // 1. Get room configuration and max capacity
    const roomSql = `
      SELECT
        room_caps_json,
        config_json,
        status,
        scheduled_at,
        CASE
          WHEN scheduled_at IS NULL THEN 1
          WHEN scheduled_at > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 120 MINUTE) THEN 1
          ELSE 0
        END AS ticket_sales_time_open
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

    // Get max capacity (try room_caps_json first, then config.roomCaps)
    const maxCapacity = roomCaps.maxPlayers
      || config.roomCaps?.maxPlayers
      || 20;

    if (DEBUG) {
      console.log('[Capacity] Room caps loaded:', {
        roomId,
        maxCapacity,
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

    const totalTickets = Number(ticketStats.total_tickets || 0);
    const redeemedTickets = Number(ticketStats.redeemed_tickets || 0);
    const claimedTickets = Number(ticketStats.claimed_tickets || 0);
    const confirmedTickets = Number(ticketStats.confirmed_tickets || 0);

    // 3. Calculate capacity usage
    const reservedByTickets = totalTickets;
    const walkInPlayers = Math.max(0, currentPlayersInRoom - redeemedTickets);
    const totalUsed = reservedByTickets + walkInPlayers;

    const availableTotal = Math.max(0, maxCapacity - totalUsed);
    const availableForTickets = Math.max(0, maxCapacity - reservedByTickets);
    const availableForWalkIns = Math.max(0, maxCapacity - reservedByTickets - walkInPlayers);

    const isFull = totalUsed >= maxCapacity;
    const ticketsFull = reservedByTickets >= maxCapacity;

    // 4. Check ticket sales window (close 2 hours before event)
    let ticketSalesOpen = true;
    let ticketSalesCloseReason = null;

    if (roomRow.status === 'completed' || roomRow.status === 'cancelled') {
      ticketSalesOpen = false;
      ticketSalesCloseReason = `Quiz is ${roomRow.status}`;
    } else if (roomRow.scheduled_at && !Number(roomRow.ticket_sales_time_open)) {
      ticketSalesOpen = false;
      ticketSalesCloseReason = 'Ticket sales closed (within 2 hours of quiz start)';
    }

    // Capacity always overrides everything
    if (ticketsFull) {
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
    const capacity = await getRoomCapacityStatus(roomId, 0);

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
  if (capacity.isFull) {
    return `SOLD OUT - This quiz is at maximum capacity (${capacity.maxCapacity} players)`;
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