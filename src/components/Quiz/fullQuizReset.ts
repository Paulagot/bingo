// src/utils/fullQuizReset.ts
import { useQuizConfig } from './useQuizConfig';
import { usePlayerStore } from './usePlayerStore';
import { useAdminStore } from './useAdminStore';

export function fullQuizReset() {
  useQuizConfig.getState().resetConfig();
  usePlayerStore.getState().resetPlayers();
  useAdminStore.getState().resetAdmins();
}
