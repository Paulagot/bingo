import { create } from 'zustand';
import type {
  StellarWalletConnection,
  EvmWalletConnection,
  SolanaWalletConnection,
  SupportedChain,
} from '../chains/types';

interface WalletState {
  // Chain-specific wallet states
  stellar: StellarWalletConnection;
  evm: EvmWalletConnection;
  solana: SolanaWalletConnection;

  // Current active chain
  activeChain: SupportedChain | null;

  // Actions
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
  isDisconnecting: false, // ✅ required by your types
  chain: 'stellar',
  error: null,
  publicKey: undefined,
  networkPassphrase: undefined,
});

const createInitialEvmState = (): EvmWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false, // ✅
  chain: 'evm',
  error: null,
  chainId: undefined,
  ens: undefined,
});

const createInitialSolanaState = (): SolanaWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false, // ✅
  chain: 'solana',
  error: null,
  publicKey: undefined,
  cluster: undefined,
});

export const useWalletStore = create<WalletState>((set) => ({
  stellar: createInitialStellarState(),
  evm: createInitialEvmState(),
  solana: createInitialSolanaState(),
  activeChain: null,

  setActiveChain: (chain) => set({ activeChain: chain }),

  updateStellarWallet: (updates) =>
    set((state) => ({ stellar: { ...state.stellar, ...updates } })),

  updateEvmWallet: (updates) =>
    set((state) => ({ evm: { ...state.evm, ...updates } })),

  updateSolanaWallet: (updates) =>
    set((state) => ({ solana: { ...state.solana, ...updates } })),

  resetWallet: (chain) =>
    set((state) => {
      switch (chain) {
        case 'stellar':
          return { ...state, stellar: createInitialStellarState() };
        case 'evm':
          return { ...state, evm: createInitialEvmState() };
        case 'solana':
          return { ...state, solana: createInitialSolanaState() };
        default:
          return state;
      }
    }),

  resetAllWallets: () =>
    set({
      stellar: createInitialStellarState(),
      evm: createInitialEvmState(),
      solana: createInitialSolanaState(),
      activeChain: null,
    }),
}));

