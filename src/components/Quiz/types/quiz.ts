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
  sponsor?: string;
  value?: number;  // Keep this exactly as-is
  tokenAddress?: string;
  isNFT?: boolean; // NEW: simple flag to distinguish token types
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
  transactionHash?: string;
  uploadedAt?: string;
}

export type RoundTypeId =
  | 'general_trivia'
  | 'wipeout';
  // | 'speed_round'
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

//src/components/quiz/types/quiz.ts

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
  fundraisingOptions: FundraisingOptions; // ✅ required
  fundraisingPrices: FundraisingPrices;   // ✅ required
  roundDefinitions: RoundDefinition[]; 
  selectedTemplate?: string;
  isCustomQuiz?: boolean;
  skipRoundConfiguration?: boolean;   // ✅ required
  questions: unknown[];
  prizeMode?: 'split' | 'assets' | 'cash';
  prizeSplits?: Record<number, number>;
  prizes?: Prize[];
  startTime?: string;
  roomId?: string;
  currencySymbol?: string;
  totalTimeSeconds?: number;
  web3Chain?: string;
  web3Currency?: string;
  web3Charity?: string; 
  web3PrizeSplit?: {
    charity: number; // min 50
    host: number;    // max 5
    prizes: number;  // max 25
  };
  hostWallet?: string; 
  eventDateTime?: string;
  timeZone?: string;
  web3ContractAddress?: string;
  // Add the missing Web3 deployment properties
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
  carryDebt?: number;   // per-round debt (if your round payload includes it)
};

export type RoomPhase = 'waiting' | 'launched' | 'asking' | 'reviewing' | 'leaderboard' | 'complete'| 'distributing_prizes';

// Props interface for round components
export interface RoundComponentProps {
  question: Question;
  timeLeft: number | null;
  timerActive: boolean;
  selectedAnswer: string;
  setSelectedAnswer: (answer: string) => void;
  answerSubmitted: boolean;
  clue: string | null;
  feedback: string | null;
  isFrozen: boolean;
  frozenNotice: string | null;
  onSubmit?: () => void; // ← Make this optional with ?
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




  
  
  