// src/features/web3/chains/solana/api/contract.api.ts
// Solana contract API - Core contract interaction functions
// This file will contain the extracted contract functions from useSolanaContract.ts
// For now, it's a placeholder that re-exports from the original location

// TODO: Extract contract functions from useSolanaContract.ts into this file
// This is a large refactoring that requires careful extraction of:
// - createPoolRoom
// - createAssetRoom
// - joinRoom
// - declareWinners
// - endRoom
// - distributePrizes
// - getRoomInfo
// - getPlayerEntry
// - etc.

// For now, re-export types and indicate this is a work in progress
export type {
  CreatePoolRoomParams,
  JoinRoomParams,
  DeclareWinnersParams,
  EndRoomParams,
  RoomInfo,
  PlayerEntryInfo,
} from '../model/types';

// Re-export the hook for backward compatibility during migration
export { useSolanaContract } from '../../../../chains/solana/useSolanaContract';

