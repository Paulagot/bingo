// server/elimination/routes/eliminationMgmtRoutes.js
//
// Auth-gated management routes for the elimination game.
// Mounted at /api/elimination/mgmt
//
// All routes require authenticateToken — club_id is always read from
// req.club_id (set by the middleware), never from the request body.
//
// Public game routes (create Web3 room, get snapshot, finalize, etc.)
// remain in eliminationRoutes.js — this file does not touch them.

import express from 'express';
import jwt from 'jsonwebtoken';
import authenticateToken from '../../middleware/auth.js';
import { createRoomFromConfig } from '../services/eliminationRoomManager.js';
import {
  scheduleEliminationRoom,
  listEliminationRooms,
  getEliminationRoom,
  updateEliminationRoom,
  cancelEliminationRoom,
  hydrateEliminationRoom,
} from './eliminationMgmtService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

console.log('[eliminationMgmtRoutes] ✅ Router loaded');

// ── All routes below require authentication ────────────────────────────────────
router.use(authenticateToken);

// ─── Helper: consistent error responses ──────────────────────────────────────
const sendError = (res, err) => {
  const status = err?.statusCode ?? 500;
  const message = err?.message ?? 'internal_error';

  // Map known service error codes to clean API error keys
  const ERROR_MAP = {
    'clubId required':                    [400, 'bad_request'],
    'roomId required':                    [400, 'bad_request'],
    'hostId required':                    [400, 'bad_request'],
    'ENTRY_FEE_REQUIRED':                 [400, 'entry_fee_required'],
    'MAX_PLAYERS_INVALID':                [400, 'max_players_invalid'],
    'PRIZE_DESCRIPTION_REQUIRED':         [400, 'prize_description_required'],
    'not_found':                          [404, 'not_found'],
    'room_not_editable':                  [409, 'room_not_editable'],
    'room_not_cancellable':               [409, 'room_not_cancellable'],
    'no_fields_to_update':                [400, 'no_fields_to_update'],
    'update_failed_or_room_changed':      [409, 'update_failed_or_room_changed'],
    'invalid_status':                     [400, 'invalid_status'],
  };

  for (const [key, [mappedStatus, errorCode]] of Object.entries(ERROR_MAP)) {
    if (message.startsWith(key)) {
      return res.status(mappedStatus).json({
        error: errorCode,
        ...(err?.currentStatus && { currentStatus: err.currentStatus }),
      });
    }
  }

  console.error('[eliminationMgmtRoutes] ❌ Unhandled error:', err);
  return res.status(status).json({ error: 'internal_error' });
};

// ─── POST /api/elimination/mgmt/schedule ─────────────────────────────────────
// Schedule a new elimination room. Saves to DB — does NOT create a socket room.
router.post('/schedule', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const {
      roomId,
      hostId,
      hostName,
      scheduledAt,
      timeZone,
      entryFee,
      currency,
      maxPlayers,
      prizeDescription,
      prizeValue,
    } = req.body;

    console.log(`[eliminationMgmtRoutes] 📅 Schedule elimination — club: ${clubId} room: ${roomId}`);

    const result = await scheduleEliminationRoom({
      clubId,
      roomId,
      hostId,
      hostName,
      scheduledAt,
      timeZone,
      entryFee,
      currency,
      maxPlayers,
      prizeDescription,
      prizeValue,
    });

    console.log(`[eliminationMgmtRoutes] ✅ Scheduled room ${result.roomId} status=${result.status}`);
    return res.status(201).json(result);
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /api/elimination/mgmt/rooms ─────────────────────────────────────────
// List elimination rooms for the logged-in club.
// Query params: status (all|scheduled|open|live|completed|cancelled), time (all|upcoming|past)
router.get('/rooms', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const status = String(req.query.status || 'all');
    const time   = String(req.query.time   || 'all');

    const rows = await listEliminationRooms({ clubId, status, time });
    return res.status(200).json({ rooms: rows });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /api/elimination/mgmt/rooms/:roomId ──────────────────────────────────
// Fetch a single elimination room (for edit modal or drawer detail).
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const row = await getEliminationRoom({ clubId, roomId });
    if (!row) return res.status(404).json({ error: 'not_found' });

    return res.status(200).json({ room: row });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── PATCH /api/elimination/mgmt/rooms/:roomId ────────────────────────────────
// Edit a scheduled elimination room.
// Only allowed while status = 'scheduled'.
router.patch('/rooms/:roomId', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const {
      scheduledAt,
      timeZone,
      entryFee,
      currency,
      maxPlayers,
      prizeDescription,
      prizeValue,
      config_json,
    } = req.body;

    console.log(`[eliminationMgmtRoutes] ✏️  Update elimination room ${roomId} — club: ${clubId}`);

    const updated = await updateEliminationRoom({
      clubId,
      roomId,
      scheduledAt,
      timeZone,
      entryFee,
      currency,
      maxPlayers,
      prizeDescription,
      prizeValue,
      configJson: config_json,
    });

    return res.status(200).json({ room: updated });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /api/elimination/mgmt/rooms/:roomId/cancel ─────────────────────────
// Cancel a scheduled or open elimination room.
router.post('/rooms/:roomId/cancel', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log(`[eliminationMgmtRoutes] 🚫 Cancel elimination room ${roomId} — club: ${clubId}`);

    await cancelEliminationRoom({ clubId, roomId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /api/elimination/mgmt/rooms/:roomId/hydrate ────────────────────────
// Load a scheduled elimination room from DB into the socket server's
// in-memory store. Called when the host clicks "Launch" on the dashboard.
//
// After this returns successfully, the frontend opens the game tab at
// /elimination/host/:roomId?hostId=... and the socket connection takes over.
router.post('/rooms/:roomId/hydrate', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log(`[eliminationMgmtRoutes] 💧 Hydrate elimination room ${roomId} — club: ${clubId}`);

    // Inject createRoomFromConfig to avoid circular import in the service layer
    const result = await hydrateEliminationRoom({
      clubId,
      roomId,
      createRoomFromConfig,
    });

    console.log(
      `[eliminationMgmtRoutes] ✅ Room ${roomId} hydrated — alreadyExisted: ${result.alreadyExisted}`
    );

    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /api/elimination/mgmt/rooms/:roomId/operator-token ─────────────────
// Generate a short-lived signed JWT for a non-logged-in operator to join
// game controls. Same pattern as the quiz operator-token route.
router.post('/rooms/:roomId/operator-token', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    // Verify room belongs to this club
    const row = await getEliminationRoom({ clubId, roomId });
    if (!row) return res.status(404).json({ error: 'not_found' });

    const token = jwt.sign(
      { roomId, role: 'operator', gameType: 'elimination' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${protocol}://${req.headers.host}`;
    const operatorUrl = `${origin}/elimination/operate/${roomId}?token=${token}`;

    console.log(
      `[eliminationMgmtRoutes] 🎤 Operator token generated — room: ${roomId} club: ${clubId}`
    );

    return res.status(200).json({ token, operatorUrl });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;