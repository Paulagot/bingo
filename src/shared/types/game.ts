// src/shared/types/game.ts
// Game-related types

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
  penaltyDebt?: number;
  tiebreakerBonus?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  clue?: string;
  timeLimit: number;
  questionStartTime?: number;
  difficulty?: string;
  category?: string;
}

export interface Prize {
  place: number;
  description: string;
  sponsor?: string | undefined;
  
  // Token identification
  tokenAddress?: string | undefined;
  tokenType?: 'erc20' | 'erc721' | 'erc1155' | undefined;
  
  // For ERC-20: amount of tokens (e.g., "500" for 500 USDC)
  // For ERC-721: always "1" (single NFT)
  // For ERC-1155: quantity of tokens (e.g., "5" for 5 copies)
  amount?: string | undefined;
  
  // For ERC-721/1155: the token ID (e.g., "1234")
  tokenId?: string | undefined;
  
  // Legacy field - keep for backward compatibility with non-EVM chains
  // DO NOT use in new EVM code
  value?: number | undefined;
  
  // NFT metadata
  isNFT?: boolean | undefined;
  
  // Upload tracking
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed' | undefined;
  uploadedAt?: string | undefined;
  transactionHash?: string | undefined;
  
  // Delivery info
  deliveryMethod?: 'in-person' | 'shipped' | 'digital' | undefined;
}


export type PrizeAwardStatus =
  | 'declared'
   | 'collected'
  | 'delivered'
  | 'unclaimed'
  | 'refused'
  | 'returned'
  | 'canceled';

export interface PrizeAward {
  prizeAwardId: string;
  prizeId?: string;
  place?: number;
  prizeName: string;
  prizeType: 'cash' | 'token' | 'nft' | 'voucher' | 'goods';
  declaredValue?: number| null;
  currency?: string;
  sponsor?: { name?: string; contact?: string; notes?: string; inKind?: boolean };

  winnerPlayerId: string;
  winnerName: string;

  status: PrizeAwardStatus;
  statusHistory: Array<{
    status: PrizeAwardStatus;
    at: string;
    byUserId: string;
    byUserName?: string;
    note?: string;
  }>;

  // existing:
  awardMethod?: 'cash' | 'card' | 'revolut' | 'web3' | 'physical' | 'other';
  awardReference?: string;
  awardedAt?: string;
  note?: string;

  // 🆕 NEW: Add timestamp fields used by UI
  collectedAt?: string;
  deliveredAt?: string;
  unclaimedAt?: string;
  refusedAt?: string;
}


export interface ReconciliationMeta {
  approvedBy?: string;
  notes?: string;
  approvedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  prizeAwards?: PrizeAward[];
  finalLeaderboard?: LeaderboardEntry[];
}

