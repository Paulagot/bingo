// src/stores/walletStore.ts
import { create } from 'zustand';
import type {
  StellarWalletConnection,
  SupportedChain,
} from '../chains/types';

interface WalletState {
  // ✅ Only Stellar state (AppKit manages EVM/Solana)
  stellar: StellarWalletConnection;
  
  // ✅ Keep activeChain for UI state
  activeChain: SupportedChain | null;

  // Actions
  setActiveChain: (chain: SupportedChain | null) => void;
  updateStellarWallet: (updates: Partial<StellarWalletConnection>) => void;
  resetStellarWallet: () => void;
  resetAllWallets: () => void;
}

const createInitialStellarState = (): StellarWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  chain: 'stellar',
  error: null,
  publicKey: undefined,
  networkPassphrase: undefined,
});

// Shallow equality helper
const shallowEqual = <T extends object>(a: T, b: T): boolean => {
  if (a === b) return true;
  const aKeys = Object.keys(a) as (keyof T)[];
  const bKeys = Object.keys(b) as (keyof T)[];
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
};

export const useWalletStore = create<WalletState>()((set, get) => ({
  stellar: createInitialStellarState(),
  activeChain: null,

  // ✅ Idempotent: only set if value actually changes
  setActiveChain: (chain) => {
    if (get().activeChain === chain) return;
    set({ activeChain: chain });
  },

  // ✅ Idempotent update: only write if merged slice is different
  updateStellarWallet: (updates) => {
    const next = { ...get().stellar, ...updates };
    if (!shallowEqual(get().stellar, next)) {
      set({ stellar: next });
    }
  },

  // ✅ Reset Stellar wallet
  resetStellarWallet: () => {
    const fresh = createInitialStellarState();
    if (!shallowEqual(get().stellar, fresh)) {
      set({ stellar: fresh });
    }
  },

  // ✅ Reset everything (only Stellar now)
  resetAllWallets: () => {
    const fresh = {
      stellar: createInitialStellarState(),
      activeChain: null as SupportedChain | null,
    };
    const s = get();
    if (
      s.activeChain === null &&
      shallowEqual(s.stellar, fresh.stellar)
    ) {
      return; // nothing to do
    }
    set(fresh);
  },
}));


