// src/components/quiz/utils/fullQuizReset.ts

//cleaning up local state in response to a backend event, cancel the quiz
import { useQuizConfig } from '../useQuizConfig';
import { usePlayerStore } from '../usePlayerStore';
import { useAdminStore } from '../useAdminStore';

export function fullQuizReset() {
  useQuizConfig.getState().resetConfig();
  usePlayerStore.getState().resetPlayers();
  useAdminStore.getState().resetAdmins();
}
