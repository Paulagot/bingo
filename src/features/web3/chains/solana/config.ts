// src/features/web3/chains/solana/config.ts
// Solana network configuration
// Re-export from existing config for backward compatibility during migration

export {
  PROGRAM_ID,
  NETWORK,
  RPC_ENDPOINTS,
  getRpcEndpoint,
  getTokenMints,
  TOKEN_MINTS,
  PDA_SEEDS,
  TX_CONFIG,
  FEES,
  solanaStorageKeys,
  SUPPORTED_WALLETS,
  EXPLORER_URLS,
  getExplorerUrl,
  type SupportedSolanaWallet,
} from '../../../chains/solana/config';

