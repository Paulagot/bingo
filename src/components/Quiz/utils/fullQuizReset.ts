// src/components/quiz/utils/fullQuizReset.ts

//cleaning up local state in response to a backend event, cancel the quiz
import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useAdminStore } from '../hooks/useAdminStore';

export function fullQuizReset() {
  useQuizConfig.getState().resetConfig();
  usePlayerStore.getState().resetPlayers();
  useAdminStore.getState().resetAdmins();
}
