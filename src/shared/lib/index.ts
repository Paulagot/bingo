// src/shared/lib/index.ts
// Barrel export for shared utilities

export * from './className';
export * from './currency';
export * from './validation';
export * from './storage';
export * from './format';
export * from './error';
export * from './type-guards';
export * from './runtime-validation';

// Blockchain-specific utilities
export * as solana from './solana';
export * as web3 from './web3';

