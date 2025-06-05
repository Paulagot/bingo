// src/components/Quiz/useQuizConfig.ts

import { create } from 'zustand';
import type { QuizConfig, RoundDefinition } from '../../types/quiz';


interface QuizState {
  config: Partial<QuizConfig>;
  hydrated: boolean;
  setFullConfig: (newConfig: Partial<QuizConfig>) => void;
  resetConfig: () => void;
}

export const useQuizConfig = create<QuizState>((set) => ({
  config: {},
  hydrated: false,

  setFullConfig: (newConfig) => set({ config: newConfig, hydrated: true }),

  resetConfig: () => set({ config: {}, hydrated: false }),
}));


