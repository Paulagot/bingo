// server/quiz/handlers/reconciliationHandlers.js
const debug = true;

import { getQuizRoom } from '../quizRoomManager.js';

/** Ensure room.config.reconciliation exists and has minimal shape */
function ensureRecon(room) {
  if (!room.config) room.config = {};
  if (!room.config.reconciliation) {
    room.config.reconciliation = { ledger: [], prizeAwards: [] };
  } else {
    if (!Array.isArray(room.config.reconciliation.ledger)) {
      room.config.reconciliation.ledger = room.config.reconciliation.ledger || [];
    }
    if (!Array.isArray(room.config.reconciliation.prizeAwards)) {
      room.config.reconciliation.prizeAwards = room.config.reconciliation.prizeAwards || [];
    }
  }
  return room.config.reconciliation;
}


/** Broadcast current reconciliation object to everyone in the room */
function emitReconState(namespace, roomId, recon) {
  namespace.to(roomId).emit('reconciliation_state', { roomId, data: recon });
}

/** Broadcast an update event (used by clients to apply partial UI updates) */
function emitReconUpdated(namespace, roomId, recon) {
  namespace.to(roomId).emit('reconciliation_updated', { roomId, data: recon });
}

/**
 * Minimal, additive merge: shallow-merge fields, but fully replace `ledger` if provided.
 * This keeps things simple for your new components which always send the full ledger array.
 */
function applyPatch(recon, patch) {
  const next = { ...recon };
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'ledger' && Array.isArray(v)) {
      next.ledger = v;
    } else {
      next[k] = v;
    }
  }
  return next;
}

export function setupReconciliationHandlers(socket, namespace) {
  // Ask for current reconciliation state
  socket.on('request_reconciliation', ({ roomId }) => {
    try {
      const room = getQuizRoom(roomId);
      if (!room) return socket.emit('quiz_error', { message: `Room not found: ${roomId}` });
      const recon = ensureRecon(room);
      if (debug) console.log('[recon] request_reconciliation', roomId);
      // send only to requester
      socket.emit('reconciliation_state', { roomId, data: recon });
    } catch (e) {
      console.error('[recon] request_reconciliation error', e);
      socket.emit('quiz_error', { message: 'Failed to fetch reconciliation state' });
    }
  });

  // Update reconciliation with a patch (approval, notes, ledger, etc.)
  socket.on('update_reconciliation', ({ roomId, patch }) => {
    try {
      const room = getQuizRoom(roomId);
      if (!room) return socket.emit('quiz_error', { message: `Room not found: ${roomId}` });
      const current = ensureRecon(room);

      const next = applyPatch(current, patch);
      room.config.reconciliation = next;

      if (debug) console.log('[recon] update', roomId, Object.keys(patch || {}));

      // broadcast to everyone in the room
      emitReconUpdated(namespace, roomId, next);

      // (Optional) keep your dashboard config mirrors fresh if you rely on room_config elsewhere:
      namespace.to(roomId).emit('room_config', { ...room.config });
    } catch (e) {
      console.error('[recon] update_reconciliation error', e);
      socket.emit('quiz_error', { message: 'Failed to update reconciliation' });
    }
  });

    // NEW: declare a prize award (status starts as 'declared')
// NEW: declare a prize award (status starts as 'declared')
socket.on('record_prize_award', ({ roomId, award }) => {
  try {
    const room = getQuizRoom(roomId);
    if (!room) return socket.emit('quiz_error', { message: `Room not found: ${roomId}` });
    const recon = ensureRecon(room);

    const id = award?.prizeAwardId || crypto.randomUUID?.() || String(Date.now());
    const existingIdx = (recon.prizeAwards || []).findIndex(a => a.prizeAwardId === id);

    const declaredAt = new Date().toISOString();

    const base = {
      prizeAwardId: id,
      status: 'declared',
      statusHistory: [
        {
          status: 'declared',
          at: declaredAt,
          byUserId: room.hostId || 'host',
          byUserName: room.config?.hostName || 'Host',
          note: award?.note || 'Declared',
        }
      ],

      ...award,
      declaredAt,
    };

    if (!recon.prizeAwards) recon.prizeAwards = [];

    if (existingIdx >= 0) {
      // Update instead of adding duplicates
      recon.prizeAwards[existingIdx] = {
        ...recon.prizeAwards[existingIdx],
        ...base
      };
    } else {
      recon.prizeAwards.push(base);
    }

    emitReconUpdated(namespace, roomId, recon);
    namespace.to(roomId).emit('room_config', { ...room.config });
  } catch (e) {
    console.error('[recon] record_prize_award error', e);
    socket.emit('quiz_error', { message: 'Failed to record prize award' });
  }
});


  // NEW: update a prize award (status transitions, delivery info, etc.)
socket.on('update_prize_award', ({ roomId, prizeAwardId, patch }) => {
  try {
    const room = getQuizRoom(roomId);
    if (!room) return socket.emit('quiz_error', { message: `Room not found: ${roomId}` });
    const recon = ensureRecon(room);

    const list = recon.prizeAwards || [];
    const idx = list.findIndex(a => a.prizeAwardId === prizeAwardId);
    if (idx === -1) return socket.emit('quiz_error', { message: `Prize award not found: ${prizeAwardId}` });

    const prev = list[idx];
    const next = { ...prev, ...patch };

    // Track status changes properly
    if (patch?.status && patch.status !== prev.status) {
      next.statusHistory = [...(prev.statusHistory || [])];
      next.statusHistory.push({
        status: patch.status,
        at: new Date().toISOString(),
        byUserId: room.hostId || 'host',
        byUserName: room.config?.hostName || 'Host',
        note: patch.note || ''
      });
    }

    list[idx] = next;
    recon.prizeAwards = list;

    emitReconUpdated(namespace, roomId, recon);
    namespace.to(roomId).emit('room_config', { ...room.config });
  } catch (e) {
    console.error('[recon] update_prize_award error', e);
    socket.emit('quiz_error', { message: 'Failed to update prize award' });
  }
});


}
