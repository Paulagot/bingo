// types/quiz.ts

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
  value?: number;
  tokenAddress?: string; // Web3 only
}

export type RoundTypeId =
  | 'general_trivia'
  | 'wipeout'
  | 'speed_round'
  | 'head_to_head'
  | 'media_puzzle';

  
export interface RoundConfig {
  questionsPerRound: number;
  timePerQuestion: number;
  totalTimeSeconds?: number;
  timePerTeam?: number;
  pointsPerQuestion?: number; 
  pointsLostPerWrong?: number; // Only for wipeout
  pointslostperunanswered?: number; // Only for wipeout
}


export interface RoundDefinition {
  roundNumber: number;
  roundType: RoundTypeId;
  config: RoundConfig;
  enabledExtras: Record<string, boolean>; // Only those valid for this round
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
  roundDefinitions: RoundDefinition[];    // ✅ required
  questions: unknown[];
  prizeMode?: 'split' | 'assets' | 'cash';
  prizeSplits?: Record<number, number>;
  prizes?: Prize[];
  startTime?: string;
  roomId?: string;
  currencySymbol?: string;
  totalTimeSeconds?: number;
}

export type ExtrasPanelProps = {
  roomId: string;
  playerId: string;
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string) => void;
  usedExtrasThisRound: Record<string, boolean>;
};



// Constant list of extras available
export const fundraisingExtras: FundraisingExtrasMeta = {
  buyHint: {
    label: 'Buy Hint',
    description: 'Use a hint to help answer',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'],
  },
  buyExtraTime: {
    label: 'Buy Extra Time',
    description: 'Add extra time on a question',
    maxPerTeam: 1,
    applicableTo: ['speed_round'],
  },
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




  
  
  