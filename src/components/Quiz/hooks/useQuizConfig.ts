// src/components/Quiz/hooks/useQuizConfig.ts

import { create } from 'zustand';
import type { QuizConfig } from '../types/quiz';


interface QuizState {
  config: Partial<QuizConfig>;
  hydrated: boolean;
  currentPhase: string | null;  // ✅ ADD THIS
  completedAt: number | null;   // ✅ ADD THIS
  
  setFullConfig: (newConfig: Partial<QuizConfig>) => void;
  setQuizPhase: (phase: string, completedAt?: number) => void;  // ✅ ADD THIS
  resetConfig: () => void;
}

export const useQuizConfig = create<QuizState>((set) => ({
  config: {},
  hydrated: false,
  currentPhase: null,     // ✅ ADD THIS
  completedAt: null,      // ✅ ADD THIS

  setFullConfig: (newConfig) =>
  set((s) => ({ config: { ...s.config, ...newConfig }, hydrated: true })),
  
  setQuizPhase: (phase, completedAt) => set({ currentPhase: phase, completedAt }), // ✅ ADD THIS

  resetConfig: () => set({ 
    config: {}, 
    hydrated: false, 
    currentPhase: null, 
    completedAt: null 
  }),
}));


