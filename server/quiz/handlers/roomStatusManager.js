// server/quiz/handlers/roomStatusManager.js

import { connection, TABLE_PREFIX } from '../../config/database.js';

const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
const debug = true;

/**
 * Update room status in database
 * @param {string} roomId - The room ID
 * @param {string} newStatus - One of: 'scheduled', 'live', 'completed', 'cancelled'
 * @returns {Promise<boolean>} Success status
 */
export async function updateRoomStatus(roomId, newStatus) {
  try {
    const sql = `
      UPDATE ${WEB2_ROOMS_TABLE}
      SET status = ?, updated_at = NOW()
      WHERE room_id = ?
    `;
    
    const [result] = await connection.execute(sql, [newStatus, roomId]);
    
    if (debug) {
      console.log(`[RoomStatus] ✅ Updated room ${roomId}: ${newStatus} (affected: ${result.affectedRows})`);
    }
    
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`[RoomStatus] ❌ Failed to update room ${roomId} to ${newStatus}:`, err);
    return false;
  }
}

/**
 * Mark room as live (scheduled → live)
 * @param {string} roomId 
 * @returns {Promise<boolean>}
 */
export async function markRoomAsLive(roomId) {
  return updateRoomStatus(roomId, 'live');
}

/**
 * Mark room as completed (live → completed)
 * Also sets ended_at timestamp
 * @param {string} roomId 
 * @returns {Promise<boolean>}
 */
export async function markRoomAsCompleted(roomId) {
  try {
    const sql = `
      UPDATE ${WEB2_ROOMS_TABLE}
      SET 
        status = 'completed',
        ended_at = NOW(),
        updated_at = NOW()
      WHERE room_id = ? AND status != 'completed'
    `;
    
    const [result] = await connection.execute(sql, [roomId]);
    
    if (debug) {
      console.log(`[RoomStatus] ✅ Marked room ${roomId} as completed (affected: ${result.affectedRows})`);
    }
    
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`[RoomStatus] ❌ Failed to mark room ${roomId} as completed:`, err);
    return false;
  }
}

/**
 * Mark room as cancelled
 * @param {string} roomId 
 * @returns {Promise<boolean>}
 */
export async function markRoomAsCancelled(roomId) {
  return updateRoomStatus(roomId, 'cancelled');
}

/**
 * Get current room status from database
 * @param {string} roomId 
 * @returns {Promise<{status: string, scheduledAt: Date|null, endedAt: Date|null}|null>}
 */
export async function getRoomStatus(roomId) {
  try {
    const sql = `
      SELECT status, scheduled_at, ended_at, updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE room_id = ?
      LIMIT 1
    `;
    
    const [rows] = await connection.execute(sql, [roomId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return {
      status: rows[0].status,
      scheduledAt: rows[0].scheduled_at,
      endedAt: rows[0].ended_at,
      updatedAt: rows[0].updated_at
    };
  } catch (err) {
    console.error(`[RoomStatus] ❌ Failed to get room ${roomId} status:`, err);
    return null;
  }
}