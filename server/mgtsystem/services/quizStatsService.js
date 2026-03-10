// server/mgtsystem/services/quizStatsService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const PAYMENT_LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

/**
 * Get room statistics (tickets, players, income) from payment ledger
 * @param {string} roomId - Quiz room identifier
 * @returns {Object} Room statistics
 */
export async function getRoomStats(roomId) {
  const sql = `
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
  
  const [rows] = await connection.execute(sql, [roomId]);
  
  const stats = rows[0] || {
    tickets_sold: 0,
    unique_players: 0,
    total_income: 0
  };
  
  return {
    ticketsSold: parseInt(stats.tickets_sold) || 0,
    uniquePlayers: parseInt(stats.unique_players) || 0,
    totalIncome: parseFloat(stats.total_income) || 0
  };
}

/**
 * Get stats for multiple rooms (batch operation)
 * @param {Array<string>} roomIds - Array of room IDs
 * @returns {Object} Map of roomId -> stats
 */
export async function getBatchRoomStats(roomIds) {
  if (!roomIds || roomIds.length === 0) {
    return {};
  }
  
  const placeholders = roomIds.map(() => '?').join(',');
  
  const sql = `
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
  
  const [rows] = await connection.execute(sql, roomIds);
  
  const statsMap = {};
  
  // Initialize all rooms with zero stats
  roomIds.forEach(roomId => {
    statsMap[roomId] = {
      ticketsSold: 0,
      uniquePlayers: 0,
      totalIncome: 0
    };
  });
  
  // Fill in actual stats
  rows.forEach(row => {
    statsMap[row.room_id] = {
      ticketsSold: parseInt(row.tickets_sold) || 0,
      uniquePlayers: parseInt(row.unique_players) || 0,
      totalIncome: parseFloat(row.total_income) || 0
    };
  });
  
  return statsMap;
}