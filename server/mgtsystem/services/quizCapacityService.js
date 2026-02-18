// server/quiz/services/quizCapacityService.js

import { connection, TABLE_PREFIX } from '../../config/database.js';

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

const DEBUG = true;

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
    
    // Get max capacity (try room_caps_json first, then config.roomCaps)
    const maxCapacity = roomCaps.maxPlayers 
                     || config.roomCaps?.maxPlayers 
                     || 20; // fallback default
    
    if (DEBUG) {
      console.log('[Capacity] Room caps loaded:', {
        roomId,
        maxCapacity,
        fromRoomCaps: !!roomCaps.maxPlayers,
        fromConfig: !!config.roomCaps?.maxPlayers,
      });
    }
    
    // 2. Count tickets that reserve capacity
    // Include: payment_claimed, payment_confirmed (but NOT refunded)
    // These hold capacity even if not yet redeemed
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
    // Reserved = all non-refunded tickets (they hold spots)
    const reservedByTickets = totalTickets;
    
    // Walk-ins = players in room who DIDN'T use a ticket
    // = currentPlayersInRoom - redeemedTickets
    const walkInPlayers = Math.max(0, currentPlayersInRoom - redeemedTickets);
    
    // Total used = tickets (reserved) + walk-ins (in room without ticket)
    // BUT: redeemed tickets are already in currentPlayersInRoom, don't double count
    const totalUsed = reservedByTickets + walkInPlayers;
    
    // Available = what's left for NEW people
    const availableTotal = Math.max(0, maxCapacity - totalUsed);
    const availableForTickets = Math.max(0, maxCapacity - reservedByTickets);
    const availableForWalkIns = Math.max(0, maxCapacity - reservedByTickets - walkInPlayers);
    
    const isFull = totalUsed >= maxCapacity;
    const ticketsFull = reservedByTickets >= maxCapacity;
    
    // 4. Check ticket sales window (close 2 hours before event)
// 4. Check ticket sales window (close 2 hours before event)
let ticketSalesOpen = true;
let ticketSalesCloseReason = null;

// Always block if completed/cancelled
if (roomRow.status === 'completed' || roomRow.status === 'cancelled') {
  ticketSalesOpen = false;
  ticketSalesCloseReason = `Quiz is ${roomRow.status}`;
} else if (roomRow.scheduled_at) {
  // NOTE: MySQL DATETIME has no timezone.
  // The MySQL driver may return this as a JS Date in server TZ, or as a string.
  // We treat it consistently below and recommend storing scheduled_at in UTC.
  const nowMs = Date.now();

  let scheduledMs;
  if (roomRow.scheduled_at instanceof Date) {
    scheduledMs = roomRow.scheduled_at.getTime();
  } else {
    // If it's a string like "YYYY-MM-DD HH:MM:SS", parsing is ambiguous.
    // Best practice: store scheduled_at as UTC and configure mysql connection timezone:'Z'.
    // For now, parse as Date and rely on server TZ (see note in section 2).
    scheduledMs = new Date(roomRow.scheduled_at).getTime();
  }

  // If scheduled time is invalid, don't allow ticket sales (safer default)
  if (!Number.isFinite(scheduledMs)) {
    ticketSalesOpen = false;
    ticketSalesCloseReason = 'Ticket sales closed (invalid scheduled time)';
  } else {
    const minutesUntilQuiz = Math.floor((scheduledMs - nowMs) / (1000 * 60));

    // Close ticket sales when <= 120 minutes before start
    if (minutesUntilQuiz <= 120) {
      ticketSalesOpen = false;
      ticketSalesCloseReason = 'Ticket sales closed (within 2 hours of quiz start)';
    }
  }
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
      totalTickets,           // All non-refunded tickets (claimed + confirmed)
      claimedTickets,         // Waiting for host confirmation
      confirmedTickets,       // Ready to redeem
      redeemedTickets,        // Already used to join
      reservedByTickets,      // Capacity held by tickets
      
      // Player stats
      currentPlayersInRoom,   // Total players in memory (includes redeemed tickets)
      walkInPlayers,          // Players who joined without tickets
      
      // Capacity analysis
      totalUsed,              // reservedByTickets + walkInPlayers
      availableTotal,         // Total spots left
      availableForTickets,    // Spots available for NEW ticket purchases
      availableForWalkIns,    // Spots available for walk-ins
      
      // Status flags
      isFull,                 // No spots left at all
      ticketsFull,            // No spots left for tickets
      ticketSalesOpen,        // Can still buy tickets
      ticketSalesCloseReason, // Why tickets can't be sold
      
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
    
    // Check if ticket sales are open
    if (!capacity.ticketSalesOpen) {
      return {
        allowed: false,
        reason: capacity.ticketSalesCloseReason || 'Ticket sales are closed',
        capacity,
      };
    }
    
    // Check if enough capacity
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
    
    // Check if room is full
    if (capacity.isFull) {
      return {
        allowed: false,
        reason: `Room is full (${capacity.maxCapacity} players maximum)`,
        capacity,
      };
    }
    
    // Check if walk-in capacity is available
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
    
    // Tickets ALWAYS have priority - they already reserved a spot
    // The only reason redemption would fail is if the ticket itself is invalid
    // (which is checked elsewhere - payment status, redemption status, etc.)
    
    // Even if room appears "full", ticket holders can join because they reserved
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