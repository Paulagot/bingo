// src/components/Quiz/hooks/useReconciliationStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Socket } from 'socket.io-client';

export type ReconciliationRecord = {
  approvedBy: string;
  notes: string;
  approvedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type State = {
  socket: Socket | null;  // <- here
  map: Record<string, ReconciliationRecord>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
};

type Actions = {
  attachSocket: (sock: Socket | null) => void;
  bindSocketListeners: () => void;

  // pre-room (setupId)
  joinSetup: (setupId: string) => void;
  loadSetup: (setupId: string) => void;
  updateSetup: (setupId: string, patch: Partial<ReconciliationRecord>, updatedBy?: string) => void;
  approveSetup: (setupId: string, approverName: string, updatedBy?: string) => void;

  // post-room (roomId)
  loadRoom: (roomId: string) => void;
  updateRoom: (roomId: string, patch: Partial<ReconciliationRecord>, updatedBy?: string) => void;
  approveRoom: (roomId: string, approverName: string, updatedBy?: string) => void;
};

const keySetup = (id: string) => `setup:${id}`;
const keyRoom  = (id: string) => `room:${id}`;

// payload typings fix your TS “implicit any” errors
interface SetupStatePayload { setupId: string; data: ReconciliationRecord; }
interface RoomStatePayload  { roomId: string; data: ReconciliationRecord; }

export const useReconciliationStore = create<State & Actions>()(
  devtools((set, get) => ({
    socket: null,
    map: {},
    loading: {},
    error: {},

    attachSocket: (sock) => set({ socket: sock }),

    bindSocketListeners: () => {
      const socket = get().socket;
      if (!socket) return;

      socket.off('setup_reconciliation_state');
      socket.off('setup_reconciliation_updated');
      socket.off('reconciliation_state');
      socket.off('reconciliation_updated');

      socket.on('setup_reconciliation_state', ({ setupId, data }: SetupStatePayload) => {
        set((s) => ({
          map: { ...s.map, [keySetup(setupId)]: data },
          loading: { ...s.loading, [keySetup(setupId)]: false },
          error: { ...s.error, [keySetup(setupId)]: null },
        }));
      });

      socket.on('setup_reconciliation_updated', ({ setupId, data }: SetupStatePayload) => {
        set((s) => ({ map: { ...s.map, [keySetup(setupId)]: data } }));
      });

      socket.on('reconciliation_state', ({ roomId, data }: RoomStatePayload) => {
        set((s) => ({
          map: { ...s.map, [keyRoom(roomId)]: data },
          loading: { ...s.loading, [keyRoom(roomId)]: false },
          error: { ...s.error, [keyRoom(roomId)]: null },
        }));
      });

      socket.on('reconciliation_updated', ({ roomId, data }: RoomStatePayload) => {
        set((s) => ({ map: { ...s.map, [keyRoom(roomId)]: data } }));
      });
    },

    // ------- setup (pre-room) -------
    joinSetup: (setupId) => { get().socket?.emit('join_setup', { setupId }); },

    loadSetup: (setupId) => {
      set((s) => ({ loading: { ...s.loading, [keySetup(setupId)]: true } }));
      get().socket?.emit('request_setup_reconciliation', { setupId });
    },

    updateSetup: (setupId, patch, updatedBy) => {
      // optimistic
      set((s) => {
        const k = keySetup(setupId);
        const cur = s.map[k] || { approvedBy: '', notes: '' };
        return {
          map: { ...s.map, [k]: { ...cur, ...patch, updatedAt: new Date().toISOString(), updatedBy: updatedBy || null } },
        };
      });
      get().socket?.emit('update_setup_reconciliation', { setupId, patch, updatedBy });
    },

    approveSetup: (setupId, approverName, updatedBy) => {
      set((s) => {
        const k = keySetup(setupId);
        const cur = s.map[k] || { approvedBy: '', notes: '' };
        return {
          map: {
            ...s.map,
            [k]: {
              ...cur,
              approvedBy: approverName || cur.approvedBy,
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              updatedBy: updatedBy || null,
            },
          },
        };
      });
      get().socket?.emit('approve_setup_reconciliation', { setupId, approverName, updatedBy });
    },

    // ------- room (post-room) -------
    loadRoom: (roomId) => {
      set((s) => ({ loading: { ...s.loading, [keyRoom(roomId)]: true } }));
      get().socket?.emit('request_reconciliation', { roomId });
    },

    updateRoom: (roomId, patch, updatedBy) => {
      set((s) => {
        const k = keyRoom(roomId);
        const cur = s.map[k] || { approvedBy: '', notes: '' };
        return {
          map: { ...s.map, [k]: { ...cur, ...patch, updatedAt: new Date().toISOString(), updatedBy: updatedBy || null } },
        };
      });
      get().socket?.emit('update_reconciliation', { roomId, patch, updatedBy });
    },

    approveRoom: (roomId, approverName, updatedBy) => {
      set((s) => {
        const k = keyRoom(roomId);
        const cur = s.map[k] || { approvedBy: '', notes: '' };
        return {
          map: {
            ...s.map,
            [k]: {
              ...cur,
              approvedBy: approverName || cur.approvedBy,
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              updatedBy: updatedBy || null,
            },
          },
        };
      });
      get().socket?.emit('approve_reconciliation', { roomId, approverName, updatedBy });
    },
  }))
);



