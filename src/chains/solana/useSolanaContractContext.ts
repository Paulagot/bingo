// src/chains/solana/useSolanaContractContext.ts


import { useSolanaWalletContext } from './SolanaWalletProvider';
import { useSolanaContract } from './useSolanaContract';

/**
 * Context-aware hook for Solana contract operations.
 * Returns null when SolanaWalletProvider is not mounted.
 * 
 * This follows the multi-chain pattern where all chain context hooks
 * are called unconditionally in generic action hooks.
 */
export function useSolanaContractContext() {
  const walletContext = useSolanaWalletContext();
  
  // No provider mounted - return null
  if (!walletContext) {
    return null;
  }
  
  // Provider mounted - safe to call Solana hooks
  return useSolanaContract();
}