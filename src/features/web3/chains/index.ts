// src/features/web3/chains/index.ts
// Barrel export for all chain modules
// Note: Solana is now in src/features/web3/solana/ (not in chains/)
// The main hook is at src/chains/solana/useSolanaContract.ts

export * from './evm';
export * from './stellar';

