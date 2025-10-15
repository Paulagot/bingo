//src/stores/walletstores
import { create } from 'zustand';
import type {
  StellarWalletConnection,
  EvmWalletConnection,
  SolanaWalletConnection,
  SupportedChain,
} from '../chains/types';

interface WalletState {
  stellar: StellarWalletConnection;
  evm: EvmWalletConnection;
  solana: SolanaWalletConnection;
  activeChain: SupportedChain | null;

  setActiveChain: (chain: SupportedChain | null) => void;
  updateStellarWallet: (updates: Partial<StellarWalletConnection>) => void;
  updateEvmWallet: (updates: Partial<EvmWalletConnection>) => void;
  updateSolanaWallet: (updates: Partial<SolanaWalletConnection>) => void;
  resetWallet: (chain: SupportedChain) => void;
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

const createInitialEvmState = (): EvmWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  chain: 'evm',
  error: null,
  chainId: undefined,
  ens: undefined,
});

const createInitialSolanaState = (): SolanaWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  chain: 'solana',
  error: null,
  publicKey: undefined,
  cluster: undefined,
});

// shallow equality helper (enough for our flat wallet slices)
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
  evm: createInitialEvmState(),
  solana: createInitialSolanaState(),
  activeChain: null,

  // ✅ Idempotent: only set if value actually changes
  setActiveChain: (chain) => {
    if (get().activeChain === chain) return;
    set({ activeChain: chain });
  },

  // ✅ Idempotent updates: only write if merged slice is different
  updateStellarWallet: (updates) => {
    const next = { ...get().stellar, ...updates };
    if (!shallowEqual(get().stellar, next)) set({ stellar: next });
  },

  updateEvmWallet: (updates) => {
    const next = { ...get().evm, ...updates };
    if (!shallowEqual(get().evm, next)) set({ evm: next });
  },

  updateSolanaWallet: (updates) => {
    const next = { ...get().solana, ...updates };
    if (!shallowEqual(get().solana, next)) set({ solana: next });
  },

  resetWallet: (chain) => {
    switch (chain) {
      case 'stellar': {
        const fresh = createInitialStellarState();
        if (!shallowEqual(get().stellar, fresh)) set({ stellar: fresh });
        break;
      }
      case 'evm': {
        const fresh = createInitialEvmState();
        if (!shallowEqual(get().evm, fresh)) set({ evm: fresh });
        break;
      }
      case 'solana': {
        const fresh = createInitialSolanaState();
        if (!shallowEqual(get().solana, fresh)) set({ solana: fresh });
        break;
      }
    }
  },

  // ✅ No-op if everything is already reset
  resetAllWallets: () => {
    const fresh = {
      stellar: createInitialStellarState(),
      evm: createInitialEvmState(),
      solana: createInitialSolanaState(),
      activeChain: null as SupportedChain | null,
    };
    const s = get();
    if (
      s.activeChain === null &&
      shallowEqual(s.stellar, fresh.stellar) &&
      shallowEqual(s.evm, fresh.evm) &&
      shallowEqual(s.solana, fresh.solana)
    ) {
      return; // nothing to do
    }
    set(fresh);
  },
}));


