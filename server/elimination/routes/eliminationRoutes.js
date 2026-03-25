import express from 'express';
import rateLimit from 'express-rate-limit';

const eliminationCreateLimiter = rateLimit({ windowMs: 60*60*1000, max: 10, message: { error: 'Too many rooms created. Try again later.' } });
const eliminationRoomLimiter = rateLimit({ windowMs: 60*1000, max: 60, message: { error: 'Too many requests.' } });
import {
  createRoom,
  getRoom,
  getRoomSnapshot,
  getReconnectSnapshot,
  endRoom,
} from '../services/eliminationRoomManager.js';
import { validateHost, validateStart } from '../services/eliminationValidationService.js';
import { generatePlayerId, generateRoomId } from '../utils/eliminationHelpers.js';
import { ROOM_STATUS } from '../utils/eliminationConstants.js';

const router = express.Router();

// ─── POST /api/elimination/rooms ──────────────────────────────────────────────
// Host creates a new room.
router.post('/rooms', eliminationCreateLimiter, (req, res) => {
  try {
    const { hostName, hostId } = req.body;

    if (!hostName || typeof hostName !== 'string') {
      return res.status(400).json({ success: false, error: 'hostName is required' });
    }

    const resolvedHostId = hostId ?? generatePlayerId();

    const room = createRoom({
      hostId: resolvedHostId,
      hostName: hostName.trim(),
      hostSocketId: null, // assigned when host connects via socket
    });

    return res.status(201).json({
      success: true,
      roomId: room.roomId,
      hostId: resolvedHostId,
      status: room.status,
      createdAt: room.createdAt,
    });
  } catch (err) {
    console.error('[Elimination] POST /rooms error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

// ─── GET /api/elimination/rooms/:roomId ───────────────────────────────────────
// Retrieve a room snapshot (for waiting room or recovery).
router.get('/rooms/:roomId', eliminationRoomLimiter, (req, res) => {
  try {
    const { roomId } = req.params;
    const snapshot = getRoomSnapshot(roomId);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    return res.json({ success: true, room: snapshot });
  } catch (err) {
    console.error('[Elimination] GET /rooms/:roomId error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch room' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/start ────────────────────────────────
// REST trigger for host to start the game (alternative to socket event).
// The actual game loop runs via socket; this just validates readiness.
router.post('/rooms/:roomId/start', (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    const { valid, error } = validateStart(roomId, hostId);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }

    // Actual game start is triggered via socket event (start_elimination_game).
    // This endpoint confirms the room is ready.
    return res.json({ success: true, message: 'Room ready to start. Emit start event via socket.' });
  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/start error:', err);
    return res.status(500).json({ success: false, error: 'Failed to validate start' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/end ──────────────────────────────────
// Host force-ends the room.
router.post('/rooms/:roomId/end', (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    const { valid, error } = validateHost(room, hostId);
    if (!valid) return res.status(403).json({ success: false, error });

    endRoom(roomId, null);

    return res.json({ success: true, message: 'Room ended' });
  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/end error:', err);
    return res.status(500).json({ success: false, error: 'Failed to end room' });
  }
});

// ─── GET /api/elimination/rooms/:roomId/player/:playerId ─────────────────────
// Reconnect snapshot: returns current room + player state for page reload recovery.
router.get('/rooms/:roomId/player/:playerId', (req, res) => {
  try {
    const { roomId, playerId } = req.params;
    const snapshot = getReconnectSnapshot(roomId, playerId);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Room or player not found' });
    }

    return res.json({ success: true, ...snapshot });
  } catch (err) {
    console.error('[Elimination] GET /rooms/:roomId/player/:playerId error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reconnect snapshot' });
  }
});

export default router;