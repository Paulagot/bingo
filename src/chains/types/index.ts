// src/chains/types/index.ts - Fix unused parameter
export * from './stellar-types';
export * from './evm-types';
export * from './solana-types';

// ===================================================================
// BASE WALLET CONNECTION INTERFACE
// ===================================================================

export interface BaseWalletConnection {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  chain: SupportedChain;
  error: WalletError | null;
  balance?: string;
  lastConnected?: Date;
}

// ===================================================================
// CHAIN PROVIDER INTERFACE
// ===================================================================

export interface ChainProvider {
  // Connection management
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  reconnect?: () => Promise<WalletConnectionResult>;
  
  // Balance and account info
  getBalance: (tokenAddress?: string) => Promise<string>;
  getAccountInfo: () => Promise<AccountInfo>;
  
  // Transaction operations
  sendTransaction: (params: TransactionParams) => Promise<TransactionResult>;
  estimateTransactionFee: (params: TransactionParams) => Promise<string>;
  
  // Event listeners
  onAccountChange?: (callback: (account: string | null) => void) => void;
  onNetworkChange?: (callback: (network: NetworkInfo) => void) => void;
  onDisconnect?: (callback: () => void) => void;
}

// ===================================================================
// SUPPORTED CHAINS
// ===================================================================

export type SupportedChain = 'stellar' | 'evm' | 'solana';

export const SUPPORTED_CHAINS: Record<SupportedChain, ChainInfo> = {
  stellar: {
    id: 'stellar',
    name: 'Stellar',
    symbol: 'XLM',
    decimals: 7,
    rpcUrl: 'https://horizon.stellar.org',
    testnetRpcUrl: 'https://horizon-testnet.stellar.org',
    blockExplorer: 'https://stellarchain.io',
    iconUrl: '/icons/stellar.svg',
  },
  evm: {
    id: 'evm',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://ethereum.publicnode.com',
    testnetRpcUrl: 'https://ethereum-sepolia.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    iconUrl: '/icons/ethereum.svg',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    testnetRpcUrl: 'https://api.devnet.solana.com',
    blockExplorer: 'https://solscan.io',
    iconUrl: '/icons/solana.svg',
  },
};

// ===================================================================
// CHAIN INFO
// ===================================================================

export interface ChainInfo {
  id: SupportedChain;
  name: string;
  symbol: string;
  decimals: number;
  rpcUrl: string;
  testnetRpcUrl: string;
  blockExplorer: string;
  iconUrl: string;
}

export interface NetworkInfo {
  chainId: string | number;
  name: string;
  isTestnet: boolean;
  rpcUrl: string;
  blockExplorer: string;
}

// ===================================================================
// WALLET CONNECTION RESULTS
// ===================================================================

export interface WalletConnectionResult {
  success: boolean;
  address: string | null;
  error?: WalletError;
  networkInfo?: NetworkInfo;
}

export interface AccountInfo {
  address: string;
  balance: string;
  nativeBalance: string;
  tokens?: TokenBalance[];
  nfts?: NFTInfo[];
}

export interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  logoUrl?: string;
  price?: number;
  value?: number;
}

export interface NFTInfo {
  tokenId: string;
  contractAddress: string;
  name: string;
  description?: string;
  imageUrl?: string;
  collection?: string;
}

// ===================================================================
// TRANSACTION INTERFACES
// ===================================================================

export interface TransactionParams {
  to: string;
  amount: string;
  tokenAddress?: string; // For token transfers
  memo?: string;
  priority?: TransactionPriority;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: WalletError;
  explorerUrl?: string;
}

export type TransactionPriority = 'slow' | 'standard' | 'fast';

export interface TransactionFee {
  amount: string;
  symbol: string;
  usdValue?: number;
}

// ===================================================================
// ERROR HANDLING
// ===================================================================

export interface WalletError {
  code: WalletErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
}

export enum WalletErrorCode {
  // Connection errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  ALREADY_CONNECTING = 'ALREADY_CONNECTING',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  WRONG_NETWORK = 'WRONG_NETWORK',
  NETWORK_SWITCH_FAILED = 'NETWORK_SWITCH_FAILED',
  
  // Transaction errors
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // Account errors
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  TIMEOUT = 'TIMEOUT',
}

// ===================================================================
// WALLET STATE MANAGEMENT
// ===================================================================

export interface WalletState {
  connection: BaseWalletConnection;
  accountInfo?: AccountInfo;
  supportedTokens: TokenInfo[];
  recentTransactions: Transaction[];
  settings: WalletSettings;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isNative: boolean;
  isSupported: boolean;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  timestamp: Date;
  status: TransactionStatus;
  explorerUrl: string;
  type: TransactionType;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum TransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  QUIZ_ENTRY = 'QUIZ_ENTRY',
  PRIZE_CLAIM = 'PRIZE_CLAIM',
  CHARITY_DONATION = 'CHARITY_DONATION',
}

export interface WalletSettings {
  autoConnect: boolean;
  preferredNetwork: 'mainnet' | 'testnet';
  slippageTolerance: number;
  gasPrice?: 'slow' | 'standard' | 'fast';
}

// ===================================================================
// QUIZ-SPECIFIC INTERFACES
// ===================================================================

export interface QuizPaymentParams extends TransactionParams {
  quizId: string;
  playerId: string;
  entryFee: string;
  charityAddress?: string;
  charityPercentage?: number;
}

export interface QuizPaymentResult extends TransactionResult {
  quizId: string;
  playerId: string;
  entryFeeTransaction?: Transaction;
  charityTransaction?: Transaction;
}

export interface PrizeDistributionParams {
  quizId: string;
  winners: WinnerInfo[];
  totalPrizePool: string;
  distributionMethod: 'equal' | 'weighted' | 'winner-takes-all';
}

export interface WinnerInfo {
  playerId: string;
  address: string;
  rank: number;
  score: number;
  prizeAmount: string;
}

// ===================================================================
// UTILITY TYPES
// ===================================================================

export type ChainSpecificConnection<T extends SupportedChain> = 
  T extends 'stellar' ? import('./stellar-types').StellarWalletConnection :
  T extends 'evm' ? import('./evm-types').EvmWalletConnection :
  T extends 'solana' ? import('./solana-types').SolanaWalletConnection :
  never;

export type ChainSpecificProvider<T extends SupportedChain> = 
  T extends 'stellar' ? import('./stellar-types').StellarChainProvider :
  T extends 'evm' ? import('./evm-types').EvmChainProvider :
  T extends 'solana' ? import('./solana-types').SolanaChainProvider :
  never;

// ===================================================================
// VALIDATION UTILITIES
// ===================================================================

export const isValidAddress = (address: string, chain: SupportedChain): boolean => {
  if (!address) return false;
  
  switch (chain) {
    case 'stellar':
      return address.length === 56 && (address.startsWith('G') || address.startsWith('M'));
    case 'evm':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'solana':
      return address.length >= 32 && address.length <= 44;
    default:
      return false;
  }
};

export const isValidAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
};

export const formatBalance = (balance: string, chainDecimals: number = 18): string => {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';
  
  if (num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
};

export const formatAddress = (address: string, chain: SupportedChain): string => {
  if (!address) return '';
  
  switch (chain) {
    case 'stellar':
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    case 'evm':
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    case 'solana':
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    default:
      return address;
  }
};
