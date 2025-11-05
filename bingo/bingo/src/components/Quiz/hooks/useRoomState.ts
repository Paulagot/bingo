// src/components/Quiz/useRoomState.ts

import { create } from 'zustand';

export interface RoomState {
  currentRound: number;
  totalRounds: number;
  roundTypeId: string;
  roundTypeName: string;
  totalPlayers: number;
  phase: string;
}

interface RoomStateStore {
  roomState: RoomState | null;
  setRoomState: (state: RoomState) => void;
  resetRoomState: () => void;
}

export const useRoomState = create<RoomStateStore>((set) => ({
  roomState: null,
  setRoomState: (state) => set({ roomState: state }),
  resetRoomState: () => set({ roomState: null }),
}));
