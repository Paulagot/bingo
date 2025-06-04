// src/components/Quiz/useQuizConfig.ts

import { create } from 'zustand';
import type { QuizConfig, RoundDefinition } from '../../types/quiz';

interface QuizState {
  config: Partial<QuizConfig>;
  updateConfig: (updates: Partial<QuizConfig>) => void;
  resetConfig: () => void;
  setConfig: (newConfig: Partial<QuizConfig>) => void;  // ✅ ADD THIS

  addRound: (round: RoundDefinition) => void;
  updateRound: (index: number, updates: Partial<RoundDefinition>) => void;
  removeRound: (index: number) => void;

  toggleExtra: (key: string) => void;
}

export const useQuizConfig = create<QuizState>((set) => ({
  config: {},

  setConfig: (newConfig) => set({ config: newConfig }),  // ✅ ADD THIS

  updateConfig: (updates) =>
    set((state) => {
      const prev = state.config;

      return {
        config: {
          ...prev,
          ...updates,
          fundraisingOptions: {
            ...(prev.fundraisingOptions ?? {}),
            ...(updates.fundraisingOptions ?? {}),
          },
          fundraisingPrices: {
            ...(prev.fundraisingPrices ?? {}),
            ...(updates.fundraisingPrices ?? {}),
          },
          roundDefinitions: updates.roundDefinitions ?? prev.roundDefinitions,
          prizes: updates.prizes ?? prev.prizes,
        },
      };
    }),

  resetConfig: () => set({ config: {} }),

  addRound: (round) =>
    set((state) => ({
      config: {
        ...state.config,
        roundDefinitions: [...(state.config.roundDefinitions || []), round],
      },
    })),

  updateRound: (index, updates) =>
    set((state) => {
      const currentRounds = state.config.roundDefinitions || [];
      const updatedRounds = currentRounds.map((r, i) =>
        i === index ? { ...r, ...updates } : r
      );
      return {
        config: {
          ...state.config,
          roundDefinitions: updatedRounds,
        },
      };
    }),

  removeRound: (index) =>
    set((state) => {
      const currentRounds = state.config.roundDefinitions || [];
      const updatedRounds = currentRounds.filter((_, i) => i !== index);
      return {
        config: {
          ...state.config,
          roundDefinitions: updatedRounds,
        },
      };
    }),

  toggleExtra: (key) =>
    set((state) => {
      const current = !!state.config.fundraisingOptions?.[key];
      return {
        config: {
          ...state.config,
          fundraisingOptions: {
            ...(state.config.fundraisingOptions ?? {}),
            [key]: !current,
          },
        },
      };
    }),
}));
