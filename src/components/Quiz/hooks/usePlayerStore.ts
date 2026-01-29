// src/components/Quiz/hooks/usePlayerStore.ts
import { create } from 'zustand';

export type PaymentMethod =
  | 'cash'
  | 'instant payment'
  | 'card'
  | 'web3'
  | 'unknown';

export interface Player {
  id: string;
  name: string;
  paid: boolean;
  disqualified?: boolean;
  paymentMethod: PaymentMethod;
  credits: number;
  extras?: string[];
  extraPayments?: {
    [extraKey: string]: {
      // record the specific method used for the extra
      method: PaymentMethod | 'other';
      amount: number;
    };
  };
  addedByAdminId?: string;
  paymentClaimed?: boolean;
paymentReference?: string | null;
clubPaymentMethodId?: number | null;
paymentConfirmedBy?: string;
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









