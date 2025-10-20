// src/components/Quiz/hooks/useQuizSetupStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QuizConfig, RoundDefinition } from '../types/quiz';
import { getCharityById } from '../../../chains/evm/config/charities';


type WizardStep = 'setup' | 'templates' | 'rounds' | 'fundraising' | 'stepPrizes' | 'review';
type WizardFlow = 'web2' | 'web3';

const PERSIST_KEY = 'quiz-setup-v2'; // keep your existing key
const VERSION = 3;

// small helper so we get a stable pre-room ID all hosts can share
const genId = () => Math.random().toString(36).slice(2, 10);

function deepMerge<T extends object>(base: T, updates: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
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

interface QuizSetupState {
  setupId: string | null;               // 🆕 pre-room collaboration key
  flow: WizardFlow;
  currentStep: WizardStep;
  setupConfig: Partial<QuizConfig>;
  roomId: string | null;
  hostId: string | null;
  lastSavedAt: number | null;

  ensureSetupId: () => string;          // 🆕 creates one if missing and returns it

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

  purgePersist: (opts?: { keepIds?: boolean }) => void; // fully clear persistence
  hardReset: (opts?: { flow?: WizardFlow; keepIds?: boolean }) => void;
  setWeb3CharityById: (id: string | null) => void;
}

export const useQuizSetupStore = create<QuizSetupState>()(
  persist(
    (set, get) => ({
      setupId: null,
      flow: 'web2',
      currentStep: 'setup',
      setupConfig: {},
      roomId: null,
      hostId: null,
      lastSavedAt: null,

      ensureSetupId: () => {
        const cur = get().setupId;
        if (cur) return cur;
        const next = `setup_${genId()}`;
        set({ setupId: next });
        return next;
      },

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

        setWeb3CharityById: (id) =>
  set((s) => {
    // lazy import avoids bundler cycles
        const c = id ? getCharityById(id) : undefined;
    return {
      setupConfig: {
        ...s.setupConfig,
        web3CharityId: c?.id,
        web3Charity: c?.name,                  // display name (for UI)
        web3CharityAddress: c?.wallet as any,  // EVM address (for deploy)
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

      purgePersist: (opts) => {
        try {
          localStorage.removeItem(PERSIST_KEY);
        } catch {}
        const keepIds = !!opts?.keepIds;
        const { roomId, hostId, setupId } = get();
        set({
          setupId: keepIds ? setupId : null,
          flow: 'web2',
          currentStep: 'setup',
          setupConfig: {},
          roomId: keepIds ? roomId : null,
          hostId: keepIds ? hostId : null,
          lastSavedAt: Date.now(),
        });
      },

      hardReset: (opts) => {
        const keepIds = !!opts?.keepIds;
        const nextFlow: WizardFlow | undefined = opts?.flow;
        get().purgePersist({ keepIds });
        if (nextFlow) {
          set({ flow: nextFlow, currentStep: 'setup' });
        }
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      version: VERSION,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 3) {
          return {
            setupId: persisted.setupId ?? null,
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
        setupId: state.setupId,
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

