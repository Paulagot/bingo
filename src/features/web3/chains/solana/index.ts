// src/features/web3/chains/solana/index.ts
// Barrel export for Solana chain module

export * from './lib';
export * from './model/types';

// Re-export hook for now (will be refactored)
export { useSolanaContract } from '../../../../chains/solana/useSolanaContract';

