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
  sponsor?: string;
  value?: number;
  tokenAddress?: string;
  isNFT?: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
  transactionHash?: string;
  uploadedAt?: string;
  tokenId?: string | number;
}

export type PrizeAwardStatus =
  | 'declared'
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
  declaredValue?: number;
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
  awardMethod?: 'cash' | 'card' | 'revolut' | 'web3' | 'physical' | 'other';
  awardReference?: string;
  awardedAt?: string;
  note?: string;
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

