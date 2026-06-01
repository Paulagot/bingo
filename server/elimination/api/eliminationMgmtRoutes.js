// server/elimination/api/eliminationMgmtRoutes.js
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
import {
  approveEliminationReconciliation,
  getEliminationReconciliation,
} from '../services/eliminationStatsService.js';
import { markReconciliationApproved } from '../services/eliminationRoomManager.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

console.log('[eliminationMgmtRoutes] ✅ Router loaded');

// ── All routes below require authentication ────────────────────────────────────
router.use(authenticateToken);

// ─── Helper: consistent error responses ──────────────────────────────────────
const sendError = (res, err) => {
  const status = err?.statusCode ?? 500;
  const message = err?.message ?? 'internal_error';

  const ERROR_MAP = {
    'clubId required':               [400, 'bad_request'],
    'roomId required':               [400, 'bad_request'],
    'hostId required':               [400, 'bad_request'],
    'ENTRY_FEE_REQUIRED':            [400, 'entry_fee_required'],
    'MAX_PLAYERS_INVALID':           [400, 'max_players_invalid'],
    'PRIZE_DESCRIPTION_REQUIRED':    [400, 'prize_description_required'],
    'not_found':                     [404, 'not_found'],
    'room_not_editable':             [409, 'room_not_editable'],
    'room_not_cancellable':          [409, 'room_not_cancellable'],
    'no_fields_to_update':           [400, 'no_fields_to_update'],
    'update_failed_or_room_changed': [409, 'update_failed_or_room_changed'],
    'invalid_status':                [400, 'invalid_status'],
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
router.post('/schedule', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const {
      roomId, hostId, hostName, scheduledAt, timeZone,
      entryFee, currency, maxPlayers, prizeDescription, prizeValue,
    } = req.body;

    console.log(`[eliminationMgmtRoutes] 📅 Schedule elimination — club: ${clubId} room: ${roomId}`);

    const result = await scheduleEliminationRoom({
      clubId, roomId, hostId, hostName, scheduledAt, timeZone,
      entryFee, currency, maxPlayers, prizeDescription, prizeValue,
    });

    console.log(`[eliminationMgmtRoutes] ✅ Scheduled room ${result.roomId} status=${result.status}`);
    return res.status(201).json(result);
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /api/elimination/mgmt/rooms ─────────────────────────────────────────
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
router.patch('/rooms/:roomId', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const {
      scheduledAt, timeZone, entryFee, currency,
      maxPlayers, prizeDescription, prizeValue, config_json,
    } = req.body;

    console.log(`[eliminationMgmtRoutes] ✏️  Update elimination room ${roomId} — club: ${clubId}`);

    const updated = await updateEliminationRoom({
      clubId, roomId, scheduledAt, timeZone, entryFee, currency,
      maxPlayers, prizeDescription, prizeValue, configJson: config_json,
    });

    return res.status(200).json({ room: updated });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /api/elimination/mgmt/rooms/:roomId/cancel ─────────────────────────
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
router.post('/rooms/:roomId/hydrate', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log(`[eliminationMgmtRoutes] 💧 Hydrate elimination room ${roomId} — club: ${clubId}`);

    const result = await hydrateEliminationRoom({ clubId, roomId, createRoomFromConfig });

    console.log(`[eliminationMgmtRoutes] ✅ Room ${roomId} hydrated — alreadyExisted: ${result.alreadyExisted}`);

    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /api/elimination/mgmt/rooms/:roomId/operator-token ─────────────────
router.post('/rooms/:roomId/operator-token', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const row = await getEliminationRoom({ clubId, roomId });
    if (!row) return res.status(404).json({ error: 'not_found' });

    const token = jwt.sign(
      { roomId, role: 'operator', gameType: 'elimination' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const origin   = `${protocol}://${req.headers.host}`;
    const operatorUrl = `${origin}/elimination/operate/${roomId}?token=${token}`;

    console.log(`[eliminationMgmtRoutes] 🎤 Operator token generated — room: ${roomId} club: ${clubId}`);

    return res.status(200).json({ token, operatorUrl });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /api/elimination/mgmt/rooms/:roomId/reconciliation ──────────────────
// Logged-in hosts fetch reconciliation via this auth-gated route.
router.get('/rooms/:roomId/reconciliation', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const row = await getEliminationRoom({ clubId, roomId });
    if (!row) return res.status(404).json({ error: 'not_found' });

    // Use the canonical room_id from DB in case URL param casing differs
    const canonicalRoomId = row.room_id ?? roomId;
    const data = await getEliminationReconciliation(canonicalRoomId);

    if (!data) {
      return res.status(404).json({ ok: false, error: 'No reconciliation record found' });
    }

    return res.json({ ok: true, ...data });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /api/elimination/mgmt/rooms/:roomId/approve-reconciliation ─────────
// Logged-in host approves reconciliation.
// Non-logged-in hosts use the socket event 'elimination_approve_reconciliation'.
router.post('/rooms/:roomId/approve-reconciliation', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    // Verify room belongs to this club
    const row = await getEliminationRoom({ clubId, roomId });
    if (!row) return res.status(404).json({ error: 'not_found' });

    // ── Use the canonical room_id from the DB row ──────────────────────────
    // The URL param and the DB value may differ in casing on case-sensitive
    // MySQL installs. Always use what the DB actually stored.
    const canonicalRoomId = row.room_id ?? roomId;

    console.log(
      `[eliminationMgmtRoutes] 🔍 approve — URL roomId: "${roomId}" | DB room_id: "${canonicalRoomId}"`
    );

    // ── Diagnostic: confirm the reconciliation record exists ───────────────
    // If it doesn't, check the quiz_reconciliation table directly so we can
    // log what IS there and give a clearer error.
    const RECONCILIATION_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
    const [diagRows] = await connection.execute(
      `SELECT room_id, approved_at FROM ${RECONCILIATION_TABLE}
       WHERE UPPER(room_id) = UPPER(?)
       LIMIT 1`,
      [canonicalRoomId]
    );

    if (!Array.isArray(diagRows) || diagRows.length === 0) {
      // Log recent records to help debug
      const [recentRows] = await connection.execute(
        `SELECT room_id, created_at FROM ${RECONCILIATION_TABLE}
         ORDER BY created_at DESC LIMIT 5`
      );
      console.error(
        `[eliminationMgmtRoutes] ❌ No reconciliation record for "${canonicalRoomId}".`,
        `Recent records:`, recentRows.map(r => r.room_id)
      );
      return res.status(404).json({
        ok: false,
        error: 'No reconciliation record found — the game stats may not have saved yet. Try again in a moment.',
      });
    }

    // Already approved? Return success idempotently.
    if (diagRows[0].approved_at) {
      console.log(`[eliminationMgmtRoutes] ℹ️  Already approved — room: ${canonicalRoomId}`);
      markReconciliationApproved(canonicalRoomId);
      return res.json({ ok: true, alreadyApproved: true });
    }

    // ── Use the exact room_id value from the DB row for the UPDATE ─────────
    const dbRoomId = diagRows[0].room_id;

    const { approvedBy, notes } = req.body;

    const result = await approveEliminationReconciliation(
      dbRoomId,
      approvedBy ?? req.user?.name ?? 'Host',
      notes ?? null
    );

    // Mark in-memory room as approved — try both the canonical and URL versions
    markReconciliationApproved(dbRoomId);
    if (dbRoomId !== roomId) markReconciliationApproved(roomId);

    console.log(
      `[eliminationMgmtRoutes] ✅ Reconciliation approved via HTTP — room: ${dbRoomId} club: ${clubId}`
    );

    return res.json({
      ok:             true,
      adjustmentsNet: result.adjustmentsNet,
      finalTotal:     result.finalTotal,
    });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;