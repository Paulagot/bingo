// src/components/Quiz/hooks/useQuizSetupStore.ts
// ...existing imports
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QuizConfig, RoundDefinition } from '../types/quiz';

type WizardStep = 'setup' | 'templates' | 'rounds' | 'fundraising' | 'stepPrizes' | 'review';
type WizardFlow = 'web2' | 'web3';

// IMPORTANT: use the SAME key as your persist config
const PERSIST_KEY = 'quiz-setup-v2';

interface QuizSetupState {
  flow: WizardFlow;
  currentStep: WizardStep;
  setupConfig: Partial<QuizConfig>;
  roomId: string | null;
  hostId: string | null;
  lastSavedAt: number | null;

  setFlow: (flow: WizardFlow) => void;
  setStep: (step: WizardStep) => void;

  setSetupConfig: (newConfig: Partial<QuizConfig>) => void;
  updateSetupConfig: (updates: Partial<QuizConfig>) => void;

  setHostName: (hostName: string) => void;
  setEntryFee: (entryFee: string) => void;
  setCurrencySymbol: (symbol: string) => void;
  setPaymentMethod: (method: QuizConfig['paymentMethod']) => void;
  setEventDateTime: (iso: string | undefined) => void;

  setTemplate: (templateId: string | 'custom', opts?: { skipRounds?: boolean }) => void;

  setRoomIds: (roomId: string, hostId: string) => void;
  clearRoomIds: () => void;

  addRound: (round: RoundDefinition) => void;
  updateRound: (index: number, updates: Partial<RoundDefinition>) => void;
  removeRound: (index: number) => void;

  toggleExtra: (key: string) => void;
  setExtraPrice: (key: string, price?: number) => void;

  resetSetupConfig: (opts?: { keepIds?: boolean }) => void;

  /** NEW: fully purge localStorage + in-memory state */
  purgePersist: (opts?: { keepIds?: boolean }) => void;

  /** NEW: one-call reset; optionally pin the flow right after reset */
  hardReset: (opts?: { flow?: WizardFlow; keepIds?: boolean }) => void;
}

function deepMerge<T extends object>(base: T, updates: Partial<T>): T {
  const out: any = { ...base };
  for (const [k, v] of Object.entries(updates)) {
    const cur = (out as any)[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && !Array.isArray(cur)) {
      (out as any)[k] = deepMerge(cur, v as any);
    } else {
      (out as any)[k] = v as any;
    }
  }
  return out;
}

export const useQuizSetupStore = create<QuizSetupState>()(
  persist(
    (set, get) => ({
      flow: 'web2',
      currentStep: 'setup',
      setupConfig: {},
      roomId: null,
      hostId: null,
      lastSavedAt: null,

      setFlow: (flow) => set({ flow, currentStep: 'setup' }),
      setStep: (currentStep) => set({ currentStep }),

      setSetupConfig: (newConfig) =>
        set({
          setupConfig: { ...newConfig },
          lastSavedAt: Date.now(),
        }),

      updateSetupConfig: (updates) =>
        set((state) => ({
          setupConfig: deepMerge(state.setupConfig, updates),
          lastSavedAt: Date.now(),
        })),

      setHostName: (hostName) =>
        set((s) => ({ setupConfig: { ...s.setupConfig, hostName }, lastSavedAt: Date.now() })),

      setEntryFee: (entryFee) =>
        set((s) => ({ setupConfig: { ...s.setupConfig, entryFee }, lastSavedAt: Date.now() })),

      setCurrencySymbol: (currencySymbol) =>
        set((s) => ({ setupConfig: { ...s.setupConfig, currencySymbol }, lastSavedAt: Date.now() })),

      setPaymentMethod: (paymentMethod) =>
        set((s) => ({ setupConfig: { ...s.setupConfig, paymentMethod }, lastSavedAt: Date.now() })),

      setEventDateTime: (iso) =>
        set((s) => ({ setupConfig: { ...s.setupConfig, eventDateTime: iso }, lastSavedAt: Date.now() })),

      setTemplate: (templateId, opts) =>
        set((s) => ({
          setupConfig: {
            ...s.setupConfig,
            selectedTemplate: templateId,
            isCustomQuiz: templateId === 'custom',
            skipRoundConfiguration: opts?.skipRounds ?? templateId !== 'custom',
          },
          lastSavedAt: Date.now(),
        })),

      setRoomIds: (roomId, hostId) => set({ roomId, hostId }),
      clearRoomIds: () => set({ roomId: null, hostId: null }),

      addRound: (round) =>
        set((state) => {
          const rounds = [...(state.setupConfig.roundDefinitions || []), round];
          return {
            setupConfig: { ...state.setupConfig, roundDefinitions: rounds },
            lastSavedAt: Date.now(),
          };
        }),

      updateRound: (index, updates) =>
        set((state) => {
          const currentRounds = state.setupConfig.roundDefinitions || [];
          const updatedRounds = currentRounds.map((r, i) => (i === index ? { ...r, ...updates } : r));
          return {
            setupConfig: { ...state.setupConfig, roundDefinitions: updatedRounds },
            lastSavedAt: Date.now(),
          };
        }),

      removeRound: (index) =>
        set((state) => {
          const currentRounds = state.setupConfig.roundDefinitions || [];
          const updatedRounds = currentRounds.filter((_, i) => i !== index);
          return {
            setupConfig: { ...state.setupConfig, roundDefinitions: updatedRounds },
            lastSavedAt: Date.now(),
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
            lastSavedAt: Date.now(),
          };
        }),

      setExtraPrice: (key, price) =>
        set((state) => {
          const next = { ...(state.setupConfig.fundraisingPrices ?? {}) };
          if (price && price > 0) (next as any)[key] = price;
          else delete (next as any)[key];
          return {
            setupConfig: {
              ...state.setupConfig,
              fundraisingPrices: next,
            },
            lastSavedAt: Date.now(),
          };
        }),

      resetSetupConfig: (opts) =>
        set((state) => ({
          setupConfig: {},
          roomId: opts?.keepIds ? state.roomId : null,
          hostId: opts?.keepIds ? state.hostId : null,
          currentStep: 'setup',
          lastSavedAt: Date.now(),
        })),

      /** NEW: remove the persisted key & fully reset in-memory */
      purgePersist: (opts) => {
        // clear localStorage for this slice
        try {
          localStorage.removeItem(PERSIST_KEY);
        } catch { /* ignore */ }
        // reset the in-memory store too
        const keepIds = !!opts?.keepIds;
        const { roomId, hostId } = get();
        set({
          flow: 'web2',
          currentStep: 'setup',
          setupConfig: {},
          roomId: keepIds ? roomId : null,
          hostId: keepIds ? hostId : null,
          lastSavedAt: Date.now(),
        });
      },

      /** NEW: convenience method for buttons/success handlers */
      hardReset: (opts) => {
        const keepIds = !!opts?.keepIds;
        const nextFlow: WizardFlow | undefined = opts?.flow;
        get().purgePersist({ keepIds });
        if (nextFlow) {
          // pin the flow and ensure first step
          set({ flow: nextFlow, currentStep: 'setup' });
        }
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2) {
          return {
            flow: persisted.flow ?? 'web2',
            currentStep: persisted.currentStep ?? 'setup',
            setupConfig: persisted.setupConfig ?? {},
            roomId: persisted.roomId ?? null,
            hostId: persisted.hostId ?? null,
            lastSavedAt: Date.now(),
          };
        }
        return persisted;
      },
      partialize: (state) => ({
        flow: state.flow,
        currentStep: state.currentStep,
        setupConfig: state.setupConfig,
        roomId: state.roomId,
        hostId: state.hostId,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
);
