// server/quiz/handlers/setupDraftHandlers.js
import { getQuizRoom } from '../quizRoomManager.js';

// in-memory (no DB)
const setupDrafts = new Map(); // key: setupId -> { reconciliation: {...}, updatedAt, updatedBy }

export function setupSetupDraftHandlers(socket, namespace) {
  socket.on('request_setup_reconciliation', ({ setupId }) => {
    const rec = setupDrafts.get(setupId)?.reconciliation || {
      approvedBy: '',
      notes: '',
      approvedAt: null,
      updatedAt: null,
      updatedBy: null,
    };
    socket.emit('setup_reconciliation_state', { setupId, data: rec });
  });

  socket.on('update_setup_reconciliation', ({ setupId, patch, updatedBy }) => {
    const cur = setupDrafts.get(setupId) || {};
    const next = {
      ...cur,
      reconciliation: {
        ...(cur.reconciliation || {
          approvedBy: '',
          notes: '',
          approvedAt: null,
          updatedAt: null,
          updatedBy: null,
        }),
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || null,
      },
    };
    setupDrafts.set(setupId, next);
    namespace.to(`setup:${setupId}`).emit('setup_reconciliation_updated', { setupId, data: next.reconciliation });
  });

  socket.on('approve_setup_reconciliation', ({ setupId, approverName, updatedBy }) => {
    const cur = setupDrafts.get(setupId) || {};
    const base = cur.reconciliation || { approvedBy: '', notes: '', approvedAt: null, updatedAt: null, updatedBy: null };
    const rec = {
      ...base,
      approvedBy: approverName || base.approvedBy || '',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || null,
    };
    setupDrafts.set(setupId, { ...cur, reconciliation: rec });
    namespace.to(`setup:${setupId}`).emit('setup_reconciliation_updated', { setupId, data: rec });
  });

  // optional helper to migrate into a room when created
  socket.on('migrate_setup_to_room', ({ setupId, roomId }) => {
    const draft = setupDrafts.get(setupId);
    if (!draft) return;
    const room = getQuizRoom(roomId);
    if (room) {
      room.reconciliation = draft.reconciliation; // move it
      setupDrafts.delete(setupId);
      namespace.to(roomId).emit('reconciliation_updated', { roomId, data: room.reconciliation });
    }
  });

  // let clients join a setup room for live updates
  socket.on('join_setup', ({ setupId }) => {
    socket.join(`setup:${setupId}`);
  });
}
