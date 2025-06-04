// hooks/quiz/usePlayerStore.ts
import { create } from 'zustand';

export interface Player {
  id: string;
  name: string;
  paid: boolean;
  disqualified?: boolean;
  paymentMethod: 'cash' | 'revolut' | 'web3' | 'unknown';
  credits: number;
  extras?: string[];
  extraPayments?: {
    [extraKey: string]: {
      method: 'cash' | 'revolut' | 'other';
      amount: number;
    };
  };
  addedByAdminId?: string;
}

interface PlayerState {
  players: Player[];

  // overwrite the entire array (called whenever the server sends a new list)
  setPlayers: (players: Player[]) => void;

  // “addPlayer” will still update the front-end array immediately,
  // but the server broadcast will re-overwrite it.
  addPlayer: (player: Player) => void;

  togglePaid: (id: string) => void;
  adjustCredits: (id: string, delta: number) => void;
  resetPlayers: () => void;
  toggleExtraForPlayer: (id: string, extra: string) => void;
  updateExtraPayment: (
    playerId: string,
    extraKey: string,
    method: 'cash' | 'revolut' | 'other',
    amount: number
  ) => void;
  removePlayer: (id: string) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  players: [],

  setPlayers: (players) => set({ players }),

  addPlayer: (player) =>
    set((state) => {
      const updated = [...state.players, player];
      return { players: updated };
    }),

  togglePaid: (id) =>
    set((state) => {
      const updated = state.players.map((p) =>
        p.id === id ? { ...p, paid: !p.paid } : p
      );
      return { players: updated };
    }),

  adjustCredits: (id, delta) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === id ? { ...p, credits: Math.max(0, p.credits + delta) } : p
      ),
    })),

  resetPlayers: () => set({ players: [] }),

  toggleExtraForPlayer: (id, extra) =>
    set((state) => {
      const updated = state.players.map((p) => {
        if (p.id !== id) return p;
        const extrasSet = new Set(p.extras || []);
        if (extrasSet.has(extra)) extrasSet.delete(extra);
        else extrasSet.add(extra);
        return { ...p, extras: Array.from(extrasSet) };
      });
      return { players: updated };
    }),

  updateExtraPayment: (playerId, extraKey, method, amount) =>
    set((state) => {
      const updated = state.players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          extraPayments: {
            ...p.extraPayments,
            [extraKey]: { method, amount },
          },
        };
      });
      return { players: updated };
    }),

  removePlayer: (id) =>
    set((state) => {
      const updated = state.players.filter((p) => p.id !== id);
      return { players: updated };
    }),
}));





