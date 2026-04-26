// server/mgtsystem/services/quizStatsService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const PAYMENT_LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;
const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;

/**
 * Get room statistics (tickets, players, income) from payment ledger
 * plus ticket verification counts from quiz_tickets.
 *
 * @param {string} roomId - Quiz room identifier
 * @returns {Object} Room statistics
 */
export async function getRoomStats(roomId) {
  const ledgerSql = `
    SELECT 
      COUNT(DISTINCT ticket_id) as tickets_sold,
      COUNT(DISTINCT player_id) as unique_players,
      SUM(CASE 
        WHEN status IN ('confirmed', 'reconciled') THEN amount 
        ELSE 0 
      END) as total_income
    FROM ${PAYMENT_LEDGER_TABLE}
    WHERE room_id = ?
  `;

  const ticketSql = `
    SELECT
      SUM(CASE
        WHEN payment_status = 'payment_claimed' THEN 1
        ELSE 0
      END) as pending_ticket_verifications
    FROM ${TICKETS_TABLE}
    WHERE room_id = ?
  `;
  
  const [[ledgerRows], [ticketRows]] = await Promise.all([
    connection.execute(ledgerSql, [roomId]),
    connection.execute(ticketSql, [roomId]),
  ]);
  
  const ledgerStats = ledgerRows?.[0] || {
    tickets_sold: 0,
    unique_players: 0,
    total_income: 0,
  };

  const ticketStats = ticketRows?.[0] || {
    pending_ticket_verifications: 0,
  };
  
  return {
    ticketsSold: parseInt(ledgerStats.tickets_sold, 10) || 0,
    uniquePlayers: parseInt(ledgerStats.unique_players, 10) || 0,
    totalIncome: parseFloat(ledgerStats.total_income) || 0,
    pendingTicketVerifications:
      parseInt(ticketStats.pending_ticket_verifications, 10) || 0,
  };
}

/**
 * Get stats for multiple rooms (batch operation)
 *
 * @param {Array<string>} roomIds - Array of room IDs
 * @returns {Object} Map of roomId -> stats
 */
export async function getBatchRoomStats(roomIds) {
  if (!roomIds || roomIds.length === 0) {
    return {};
  }
  
  const placeholders = roomIds.map(() => '?').join(',');
  
  const ledgerSql = `
    SELECT 
      room_id,
      COUNT(DISTINCT ticket_id) as tickets_sold,
      COUNT(DISTINCT player_id) as unique_players,
      SUM(CASE 
        WHEN status IN ('confirmed', 'reconciled') THEN amount 
        ELSE 0 
      END) as total_income
    FROM ${PAYMENT_LEDGER_TABLE}
    WHERE room_id IN (${placeholders})
    GROUP BY room_id
  `;

  const ticketSql = `
    SELECT
      room_id,
      SUM(CASE
        WHEN payment_status = 'payment_claimed' THEN 1
        ELSE 0
      END) as pending_ticket_verifications
    FROM ${TICKETS_TABLE}
    WHERE room_id IN (${placeholders})
    GROUP BY room_id
  `;
  
  const [[ledgerRows], [ticketRows]] = await Promise.all([
    connection.execute(ledgerSql, roomIds),
    connection.execute(ticketSql, roomIds),
  ]);
  
  const statsMap = {};
  
  // Initialize all rooms with zero stats
  roomIds.forEach((roomId) => {
    statsMap[roomId] = {
      ticketsSold: 0,
      uniquePlayers: 0,
      totalIncome: 0,
      pendingTicketVerifications: 0,
    };
  });
  
  // Fill in ledger stats
  ledgerRows.forEach((row) => {
    statsMap[row.room_id] = {
      ...statsMap[row.room_id],
      ticketsSold: parseInt(row.tickets_sold, 10) || 0,
      uniquePlayers: parseInt(row.unique_players, 10) || 0,
      totalIncome: parseFloat(row.total_income) || 0,
    };
  });

  // Fill in pending ticket verification stats
  ticketRows.forEach((row) => {
    statsMap[row.room_id] = {
      ...statsMap[row.room_id],
      pendingTicketVerifications:
        parseInt(row.pending_ticket_verifications, 10) || 0,
    };
  });
  
  return statsMap;
}