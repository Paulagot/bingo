//src/components/quiz/types/quiz.ts

export interface FundraisingExtraRule {
   label: string;
  maxPerTeam: number; // ✅ updated from maxPerPlayer to match your new per-team logic
  description: string;
  applicableTo: RoundTypeId[] | 'global';
}

export interface FundraisingExtrasMeta {
  [key: string]: FundraisingExtraRule;
}


export interface Prize {
  place: number;
  description: string;
  sponsor?: string | undefined;
  
  // Token identification
  tokenAddress?: string | undefined;
 tokenType?: 
  | 'erc20' | 'erc721' | 'erc1155'  // EVM
  | 'spl-token' | 'nft'              // ✅ Add these for Solana
  | undefined;
  
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


export type RoundTypeId =
  | 'general_trivia'
  | 'wipeout'
  | 'speed_round'
  | 'hidden_object'
  | 'order_image';
  // | 'head_to_head'
  // | 'media_puzzle';

  
export interface RoundConfig {
  questionsPerRound: number;
  timePerQuestion: number;
  totalTimeSeconds?: number;
  timePerTeam?: number;
 pointsPerDifficulty?: {
  easy: number;
  medium: number;
  hard: number;
}; 
  pointsLostPerWrong?: number; // For wipeout
  timeToAnswer?: number; // For head-to-head
  skipAllowed?: boolean; // For speed round
  pointsLostPerUnanswered?: number; // For wipeout
    filters?: {
    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
    category?: string | 'mixed';
  };
    hiddenObject?: {
    timeLimitSeconds?: number; // e.g. 30
    secondsToPoints?: number;  // e.g. 1
    itemCountByDifficulty?: { easy: number; medium: number; hard: number };
    pointsPerFindByDifficulty?: { easy: number; medium: number; hard: number };
    puzzleId?: string;         // optional, if host chooses a specific puzzle
  };
}


export interface RoundDefinition {
  roundNumber: number;
  roundType: RoundTypeId;
  config: RoundConfig;
  enabledExtras: Record<string, boolean>; // Only those valid for this round
 category?: string;         // 🆕 New: e.g., "Science", "History"
  difficulty?: 'easy' | 'medium' | 'hard'; // 🆕 New
}
export interface FundraisingOptions {
  [key: string]: boolean; // e.g., buyHint: true
}

export interface FundraisingPrices {
  [key: string]: number; // e.g., buyHint: 2
}

export interface RoundTypeDefinition {
  id: RoundTypeId;
  name: string;
  description: string;
  defaultConfig: RoundConfig;
}

export interface RoomCaps {
  maxPlayers: number;
  maxRounds: number;
  // In Web2 we store explicit arrays; in Web3 we sometimes use a wildcard
  roundTypesAllowed?: string[] | '*';
  extrasAllowed?: string[] | '*';
}



export interface QuizConfig {
  hostName: string;
  hostId: string;
  gameType: string;
  teamBased: boolean;
  roundCount: number;
  timePerQuestion: number;
  useMedia: boolean;
  entryFee: string;
  paymentMethod: 'cash_or_revolut' | 'web3';
  fundraisingOptions: FundraisingOptions;
  fundraisingPrices: FundraisingPrices;
  roundDefinitions: RoundDefinition[];
  selectedTemplate?: string;
  isCustomQuiz?: boolean;
  skipRoundConfiguration?: boolean;
  questions: unknown[];
  
  // ✅ CRITICAL: Make prizeMode required for web3 rooms
  prizeMode?: 'split' | 'assets' ;
  
  prizeSplits?: Record<number, number>;
  prizes?: Prize[];
  startTime?: string;
  roomId?: string;
  currencySymbol?: string;
  totalTimeSeconds?: number;
  web3Chain?: string;
  web3Currency?: string;
  web3Charity?: string;
  web3ChairtyOrgId?: string; // ✅ ADD THIS for TGB
  web3PrizeSplit?: {
    charity: number;
    host: number;
    prizes: number;
  };
  hostWallet?: string;
  eventDateTime?: string;
  timeZone?: string;
  web3ContractAddress?: string;
  web3ChainConfirmed?: string;
  hostWalletConfirmed?: string;
  contractAddress?: string;
  deploymentTxHash?: string;
  sponsors?: Array<{
    name: string;
    logo?: string;
    message?: string;
    website?: string;
  }>;
  completionMessage?: string;
  theme?: string;
  roomCaps?: RoomCaps;
  isWeb3Room?: boolean;
  reconciliation?: ReconciliationMeta;
  evmNetwork?: 'base' | 'baseSepolia' | 'polygon' | 'polygonAmoy';
  solanaCluster?: 'mainnet' | 'devnet';
  stellarNetwork?: 'public' | 'testnet';
}

export type ExtrasPanelProps = {
  roomId: string;
  playerId: string;
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void; // ← Add optional second parameter
  usedExtrasThisRound: Record<string, boolean>;
  answerSubmitted?: boolean;
};

// Constant list of extras available
export const fundraisingExtras: FundraisingExtrasMeta = {
  buyHint: {
    label: 'Buy Hint',
    description: 'Use a hint to help answer',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'],
  },
  // buyExtraTime: {
  //   label: 'Buy Extra Time',
  //   description: 'Add extra time on a question',
  //   maxPerTeam: 1,
  //   applicableTo: ['speed_round'],
  // },
  restorePoints: {
    label: 'Restore Points',
    description: 'Restore points if score is negative',
    maxPerTeam: 1,
    applicableTo: ['wipeout'],
  },
  robPoints: {
    label: 'Rob Points',
    description: 'Steal 2 points from another team',
    maxPerTeam: 1,
    applicableTo: 'global',
  },
  freezeOutTeam: {
    label: 'Freeze Out Team',
    description: 'Freeze a competitor team for one question',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'],
  },
};

// ===== ADDITIONAL TYPES FOR REFACTORED ARCHITECTURE =====

export interface User {
  id: string;
  name: string;
}

export type Question = {
  id: string;
  text: string;
  options: string[];
  clue?: string;
  timeLimit: number;
  questionStartTime?: number;
   difficulty?: string;    // Add this
  category?: string; 
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  cumulativeNegativePoints?: number; // Total negative points accumulated
  pointsRestored?: number; // Points restored by this player
   penaltyDebt?: number; // overall unpaid debt carried across rounds
  tiebreakerBonus?: number; // ✅ new   // per-round debt (if your round payload includes it)
};

export type RoomPhase = 'waiting' | 'launched' | 'asking' | 'reviewing' | 'leaderboard' | 'complete'| 'distributing_prizes';

// Props interface for round components
export interface RoundComponentProps {
  question: Question | null;
  timeLeft: number | null;
  timerActive: boolean;
  selectedAnswer: string;
  setSelectedAnswer: (answer: string) => void;
  answerSubmitted: boolean;
  clue: string | null;
  feedback: string | null;
  isFrozen: boolean;
  frozenNotice: string | null;
    onSubmit?: (answer?: string) => void; // ← Make this optional with ?
  roomId: string;
  playerId: string;
  roundExtras: string[];
  usedExtras: Record<string, boolean>;
  usedExtrasThisRound: Record<string, boolean>;
  onUseExtra: (extraId: string) => void;
}

// Props for the round router
export interface RoundRouterProps extends RoundComponentProps {
  roomPhase: 'asking' | 'reviewing';
  currentRoundType?: RoundTypeId;
}

// Props for review phase component
export interface ReviewPhaseProps {
  question: Question;
  selectedAnswer: string;
  feedback: string | null;
}

// Hook parameter types
export interface UseQuizTimerParams {
  question: Question | null;
  timerActive: boolean;
  onTimeUp: () => void;
}

export interface UseRoundExtrasParams {
  allPlayerExtras: string[];
  currentRoundType?: RoundTypeId;
  debug?: boolean;
}

export interface UseAnswerSubmissionParams {
  socket: any;
  roomId: string;
  playerId: string;
  debug?: boolean;
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
  declaredValue?: number | null;
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


export interface ReconciliationMeta  {
  approvedBy?: string;
  notes?: string;
  approvedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  // NEW
  prizeAwards?: PrizeAward[];
  finalLeaderboard?: LeaderboardEntry[];
   ledger?: Array<any>;
};


// Add this interface for speed round host stats
export interface HostSpeedStats {
  totalAnswers: number;
  correct: number;
  wrong: number;
  skipped: number;
  answersPerSec: number;
}

// Add this interface for speed round activity
export interface HostSpeedActivity {
  playerId: string;
  playerName: string;
  correct: boolean;
  wrong: boolean;
  skipped: boolean;
  questionId: string;
  submittedAnswer: string | null;
  correctAnswer: string | null;
  ts: number;
}


export interface EnhancedPlayerStats {
  playerId: string;
  playerName: string;
  questionPerformance: {
    totalAnswered: number;
    correctAnswers: number;
    wrongAnswers: number;
    noAnswers: number;
    skippedAnswers?: number;    // NEW: Speed round skips
    accuracyRate: number;
    pointsPerQuestion: number;
  };
  roundProgression: {
    scoreByRound: number[];
    bestRoundScore: number;
    worstRoundScore: number;
    totalRounds: number;
    trendDirection: 'improving' | 'consistent' | 'declining';
  };
  strategicPlay: {
    extrasUsed: number;
    extrasTypes: string[];
    penaltiesReceived: number;
    pointsRestored: number;
  };
  finalStats: {
    finalScore: number;
    cumulativeNegativePoints: number;
    pointsRestored: number;
  };
}

// ✅ ADD THIS after your existing exports:

/**
 * Player payment tracking (for admin view)
 */
export interface PlayerPaymentInfo {
  paid: boolean;
  paymentClaimed?: boolean;
  paymentClaimedAt?: string;
  paymentReference?: string;
  paymentConfirmedBy?: string;
  paymentConfirmedAt?: string;
  paymentMethod?: 'cash' | 'instant_payment' | 'card' | 'stripe' | 'other';
}

/**
 * Extended player with payment info
 */
export interface PlayerWithPayment extends User {
  paid: boolean;
  paymentClaimed?: boolean;
  paymentReference?: string;
  paymentMethod?: 'cash' | 'instant_payment' | 'card' | 'stripe' | 'other';
  extras?: string[];
  extraPayments?: Record<string, { method: string; amount: number }>;
  disqualified?: boolean;
}





  
  
  