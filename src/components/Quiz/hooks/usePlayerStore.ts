//src/components/Quiz/hooks/usePlayerStore.ts
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
  hydrated: boolean;
  setFullPlayers: (players: Player[]) => void;
  resetPlayers: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  players: [],
  hydrated: false,

  setFullPlayers: (players) => set({ players, hydrated: true }),

  resetPlayers: () => set({ players: [], hydrated: false }),
}));








