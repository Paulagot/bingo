// server/mgtsystem/routes/quizStats.js
import express from 'express';
import { getRoomStats, getBatchRoomStats } from '../services/quizStatsService.js';

const router = express.Router();

/**
 * GET /api/quiz/web2/rooms/:roomId/stats
 * Get room statistics (tickets, players, income)
 * Public endpoint - no auth required
 */
router.get('/rooms/:roomId/stats', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required'
      });
    }
    
    console.log(`📊 Fetching stats for room: ${roomId}`);
    
    const stats = await getRoomStats(roomId);
    
    console.log(`✅ Stats for room ${roomId}:`, stats);
    
    res.json({
      ok: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching room stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch room stats',
      message: error.message
    });
  }
});

/**
 * POST /api/quiz/web2/rooms/batch-stats
 * Get stats for multiple rooms (batch operation)
 * Body: { roomIds: string[] }
 */
router.post('/rooms/batch-stats', async (req, res) => {
  try {
    const { roomIds } = req.body;
    
    if (!roomIds || !Array.isArray(roomIds)) {
      return res.status(400).json({
        ok: false,
        error: 'roomIds array is required'
      });
    }
    
    console.log(`📊 Fetching batch stats for ${roomIds.length} rooms`);
    
    const statsMap = await getBatchRoomStats(roomIds);
    
    console.log(`✅ Retrieved batch stats for ${Object.keys(statsMap).length} rooms`);
    
    res.json({
      ok: true,
      stats: statsMap
    });
    
  } catch (error) {
    console.error('❌ Error fetching batch stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch batch stats',
      message: error.message
    });
  }
});

export default router;