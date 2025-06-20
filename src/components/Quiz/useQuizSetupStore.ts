import { create } from 'zustand';
import type { QuizConfig, RoundDefinition } from '../Quiz/types/quiz';

interface QuizSetupState {
  setupConfig: Partial<QuizConfig>;
  updateSetupConfig: (updates: Partial<QuizConfig>) => void;
  resetSetupConfig: () => void;
  setSetupConfig: (newConfig: Partial<QuizConfig>) => void;

  addRound: (round: RoundDefinition) => void;
  updateRound: (index: number, updates: Partial<RoundDefinition>) => void;
  removeRound: (index: number) => void;

  toggleExtra: (key: string) => void;
}

export const useQuizSetupStore = create<QuizSetupState>((set) => ({
  setupConfig: {},

  setSetupConfig: (newConfig) => set({ setupConfig: newConfig }),

  updateSetupConfig: (updates) =>
    set((state) => {
      const prev = state.setupConfig;
      return {
        setupConfig: {
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

  resetSetupConfig: () => set({ setupConfig: {} }),

  addRound: (round) =>
    set((state) => ({
      setupConfig: {
        ...state.setupConfig,
        roundDefinitions: [...(state.setupConfig.roundDefinitions || []), round],
      },
    })),

  updateRound: (index, updates) =>
    set((state) => {
      const currentRounds = state.setupConfig.roundDefinitions || [];
      const updatedRounds = currentRounds.map((r, i) =>
        i === index ? { ...r, ...updates } : r
      );
      return {
        setupConfig: {
          ...state.setupConfig,
          roundDefinitions: updatedRounds,
        },
      };
    }),

  removeRound: (index) =>
    set((state) => {
      const currentRounds = state.setupConfig.roundDefinitions || [];
      const updatedRounds = currentRounds.filter((_, i) => i !== index);
      return {
        setupConfig: {
          ...state.setupConfig,
          roundDefinitions: updatedRounds,
        },
      };
    }),

  toggleExtra: (key) =>
    set((state) => {
      const current = !!state.setupConfig.fundraisingOptions?.[key];
      return {
        setupConfig: {
          ...state.setupConfig,
          fundraisingOptions: {
            ...(state.setupConfig.fundraisingOptions ?? {}),
            [key]: !current,
          },
        },
      };
    }),
}));

