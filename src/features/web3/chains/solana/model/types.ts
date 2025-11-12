// src/features/web3/chains/solana/model/types.ts
// Solana contract types

import { PublicKey, BN } from '@solana/web3.js';

export interface CreatePoolRoomParams {
  roomId: string;
  charityWallet: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  hostFeeBps: number;
  prizePoolBps: number;
  firstPlacePct: number;
  secondPlacePct?: number;
  thirdPlacePct?: number;
  charityMemo: string;
  expirationSlots?: BN;
  feeTokenMint: PublicKey;
}

export interface JoinRoomParams {
  roomId: string;
  hostPubkey?: PublicKey;
  entryFee?: BN;
  extrasAmount?: BN;
  feeTokenMint?: PublicKey;
  roomPDA?: PublicKey;
}

export interface DeclareWinnersParams {
  roomId: string;
  hostPubkey: PublicKey;
  winners: PublicKey[];
}

export interface EndRoomParams {
  roomId: string;
  hostPubkey: PublicKey;
  winners: PublicKey[];
  feeTokenMint: PublicKey;
}

export interface RoomInfo {
  roomId: string;
  host: PublicKey;
  feeTokenMint: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  playerCount: number;
  totalCollected: BN;
  status: unknown;
  ended: boolean;
  expirationSlot: BN;
  hostFeeBps: number;
  prizePoolBps: number;
  charityBps: number;
  prizeMode?: unknown;
  prizeAssets?: Array<{
    mint: PublicKey;
    amount: BN;
    deposited: boolean;
  } | null>;
}

export interface PlayerEntryInfo {
  player: PublicKey;
  room: PublicKey;
  entryPaid: BN;
  extrasPaid: BN;
  totalPaid: BN;
  joinSlot: BN;
}

