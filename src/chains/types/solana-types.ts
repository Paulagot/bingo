// src/chains/types/solana-types.ts
import type { 
  BaseWalletConnection, 
  ChainProvider, 
  TransactionParams,
  TransactionResult,
  AccountInfo,
  NetworkInfo,
  WalletConnectionResult
} from './index';

// ===================================================================
// SOLANA WALLET CONNECTION
// ===================================================================

export interface SolanaWalletConnection extends BaseWalletConnection {
  chain: 'solana';
  publicKey?: string;
  cluster?: SolanaCluster;
  walletType?: SolanaWalletType;
  commitment?: SolanaCommitment;
}

export type SolanaWalletType = 'phantom' | 'solflare' | 'backpack' | 'glow' | 'slope' | 'mathwallet' | 'coin98' | 'clover';

export type SolanaCluster = 'mainnet-beta' | 'testnet' | 'devnet';

export type SolanaCommitment = 'processed' | 'confirmed' | 'finalized';

export const SOLANA_WALLET_TYPES: Record<SolanaWalletType, SolanaWalletInfo> = {
  phantom: {
    name: 'Phantom',
    icon: '/icons/phantom.svg',
    downloadUrl: 'https://phantom.app/',
    isExtension: true,
    supportsMobile: true,
  },
  solflare: {
    name: 'Solflare',
    icon: '/icons/solflare.svg',
    downloadUrl: 'https://solflare.com/',
    isExtension: true,
    supportsMobile: true,
  },
  backpack: {
    name: 'Backpack',
    icon: '/icons/backpack.svg',
    downloadUrl: 'https://backpack.app/',
    isExtension: true,
    supportsMobile: false,
  },
  glow: {
    name: 'Glow',
    icon: '/icons/glow.svg',
    downloadUrl: 'https://glow.app/',
    isExtension: true,
    supportsMobile: true,
  },
  slope: {
    name: 'Slope',
    icon: '/icons/slope.svg',
    downloadUrl: 'https://slope.finance/',
    isExtension: true,
    supportsMobile: true,
  },
  mathwallet: {
    name: 'MathWallet',
    icon: '/icons/mathwallet.svg',
    downloadUrl: 'https://mathwallet.org/',
    isExtension: true,
    supportsMobile: true,
  },
  coin98: {
    name: 'Coin98',
    icon: '/icons/coin98.svg',
    downloadUrl: 'https://coin98.com/',
    isExtension: true,
    supportsMobile: true,
  },
  clover: {
    name: 'Clover',
    icon: '/icons/clover.svg',
    downloadUrl: 'https://clover.finance/',
    isExtension: true,
    supportsMobile: false,
  },
};

export interface SolanaWalletInfo {
  name: string;
  icon: string;
  downloadUrl: string;
  isExtension: boolean;
  supportsMobile: boolean;
}

// ===================================================================
// SOLANA CHAIN PROVIDER
// ===================================================================

export interface SolanaChainProvider extends ChainProvider {
  // Solana-specific connection methods
  connectWithWallet: (walletType: SolanaWalletType) => Promise<WalletConnectionResult>;
  switchCluster: (cluster: SolanaCluster) => Promise<boolean>;
  
  // Account operations
  getAccountInfo: (address?: string) => Promise<SolanaAccountInfo>;
  getMultipleAccounts: (addresses: string[]) => Promise<SolanaAccountInfo[]>;
  
  // SPL Token operations
  getSplTokenBalance: (tokenMintAddress: string) => Promise<string>;
  getAllTokenBalances: () => Promise<SolanaTokenBalance[]>;
  transferSplToken: (params: SolanaTokenTransferParams) => Promise<TransactionResult>;
  createAssociatedTokenAccount: (tokenMintAddress: string) => Promise<TransactionResult>;
  
  // Transaction methods
  sendTransaction: (params: SolanaTransactionParams) => Promise<TransactionResult>;
  sendSolTransfer: (params: SolanaSolTransferParams) => Promise<TransactionResult>;
  simulateTransaction: (params: SolanaTransactionParams) => Promise<SolanaSimulationResult>;
  
  // Program interactions
  callProgram: (params: SolanaProgramCallParams) => Promise<TransactionResult>;
  getProgram: (programId: string) => Promise<SolanaProgramInfo>;
  
  // Network and cluster info
  getClusterInfo: () => Promise<SolanaNetworkInfo>;
  getSlot: (commitment?: SolanaCommitment) => Promise<number>;
  getBlockHeight: (commitment?: SolanaCommitment) => Promise<number>;
  getRecentBlockhash: (commitment?: SolanaCommitment) => Promise<string>;
  
  // Transaction history
  getTransactionHistory: (address?: string, limit?: number) => Promise<SolanaTransaction[]>;
  getTransaction: (signature: string) => Promise<SolanaTransaction | null>;
  
  // Fee estimation
  estimateTransactionFee: (params: SolanaTransactionParams) => Promise<string>;
  getRecentPrioritizationFees: () => Promise<SolanaPriorityFee[]>;
}

// ===================================================================
// SOLANA NETWORKS
// ===================================================================

export interface SolanaNetworkInfo extends NetworkInfo {
  cluster: SolanaCluster;
  rpcEndpoint: string;
  wsEndpoint?: string;
  version: string;
  slot: number;
  blockHeight: number;
  epoch: number;
  absoluteSlot: number;
}

export const SOLANA_CLUSTERS: Record<SolanaCluster, SolanaClusterConfig> = {
  'mainnet-beta': {
    name: 'Mainnet Beta',
    cluster: 'mainnet-beta',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
    isTestnet: false,
    chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
  testnet: {
    name: 'Testnet',
    cluster: 'testnet',
    rpcEndpoint: 'https://api.testnet.solana.com',
    wsEndpoint: 'wss://api.testnet.solana.com',
    isTestnet: true,
    chainId: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
  },
  devnet: {
    name: 'Devnet',
    cluster: 'devnet',
    rpcEndpoint: 'https://api.devnet.solana.com',
    wsEndpoint: 'wss://api.devnet.solana.com',
    isTestnet: true,
    chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  },
};

export interface SolanaClusterConfig {
  name: string;
  cluster: SolanaCluster;
  rpcEndpoint: string;
  wsEndpoint?: string;
  isTestnet: boolean;
  chainId: string;
}

// ===================================================================
// SOLANA TOKENS
// ===================================================================

export interface SolanaToken {
  mintAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isNative: boolean;
  verified?: boolean;
  tags?: string[];
}

export interface SolanaTokenBalance {
  token: SolanaToken;
  balance: string;
  uiAmount: number;
  associatedTokenAccount?: string;
  owner: string;
}

export interface SolanaTokenInfo extends SolanaToken {
  totalSupply?: string;
  circulatingSupply?: string;
  marketCap?: number;
  price?: number;
  change24h?: number;
  volume24h?: number;
  holders?: number;
  freezeAuthority?: string;
  mintAuthority?: string;
}

// Common Solana tokens
export const SOLANA_TOKENS: Record<string, SolanaToken> = {
  SOL: {
    mintAddress: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    isNative: true,
    verified: true,
  },
  USDC: {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
    verified: true,
    tags: ['stablecoin'],
  },
  USDT: {
    mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    verified: true,
    tags: ['stablecoin'],
  },
  RAY: {
    mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    symbol: 'RAY',
    name: 'Raydium',
    decimals: 6,
    isNative: false,
    verified: true,
    tags: ['defi'],
  },
};

// ===================================================================
// SOLANA TRANSACTIONS
// ===================================================================

export interface SolanaTransactionParams extends TransactionParams {
  feePayer?: string;
  recentBlockhash?: string;
  computeUnitLimit?: number;
  computeUnitPrice?: number;
  commitment?: SolanaCommitment;
  maxRetries?: number;
  preflightCommitment?: SolanaCommitment;
  skipPreflight?: boolean;
}

export interface SolanaSolTransferParams extends SolanaTransactionParams {
  fromPubkey: string;
  toPubkey: string;
  lamports: string; // Amount in lamports (1 SOL = 1e9 lamports)
}

export interface SolanaTokenTransferParams extends SolanaTransactionParams {
  tokenMintAddress: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  amount: string;
  decimals: number;
}

export interface SolanaProgramCallParams extends SolanaTransactionParams {
  programId: string;
  accounts: SolanaAccountMeta[];
  data: Buffer | Uint8Array;
}

export interface SolanaAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface SolanaSimulationResult {
  success: boolean;
  logs?: string[];
  unitsConsumed?: number;
  error?: {
    code: number;
    message: string;
  };
}

export interface SolanaPriorityFee {
  slot: number;
  prioritizationFee: number;
}

// ===================================================================
// SOLANA ACCOUNT INFO
// ===================================================================

export interface SolanaAccountInfo extends AccountInfo {
  lamports: string;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  data?: {
    program: string;
    parsed?: any;
    space: number;
  };
  tokenAccounts?: SolanaTokenAccount[];
}

export interface SolanaTokenAccount {
  account: {
    data: {
      program: string;
      parsed: {
        info: {
          isNative: boolean;
          mint: string;
          owner: string;
          state: string;
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
          };
        };
        type: string;
      };
      space: number;
    };
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch: number;
  };
  pubkey: string;
}

// ===================================================================
// SOLANA PROGRAMS
// ===================================================================

export interface SolanaProgramInfo {
  programId: string;
  name: string;
  description?: string;
  version?: string;
  authority?: string;
  deployedSlot?: number;
  upgradeAuthority?: string;
  verified?: boolean;
}

export const SOLANA_PROGRAMS: Record<string, SolanaProgramInfo> = {
  SYSTEM: {
    programId: '11111111111111111111111111111111',
    name: 'System Program',
    description: 'Core Solana system program',
    verified: true,
  },
  TOKEN: {
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'SPL Token Program',
    description: 'Standard Program Library Token Program',
    verified: true,
  },
  ASSOCIATED_TOKEN: {
    programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    name: 'Associated Token Account Program',
    description: 'Creates associated token accounts',
    verified: true,
  },
  MEMO: {
    programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    name: 'Memo Program',
    description: 'Add memo to transactions',
    verified: true,
  },
};

// ===================================================================
// SOLANA TRANSACTIONS
// ===================================================================

export interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  confirmationStatus: SolanaCommitment;
  fee: number;
  status: {
    Ok: null | any;
    Err?: any;
  };
  meta: {
    err: any;
    fee: number;
    innerInstructions: any[];
    logMessages: string[];
    postBalances: number[];
    postTokenBalances: any[];
    preBalances: number[];
    preTokenBalances: any[];
    rewards: any[];
    status: { Ok: null } | { Err: any };
  };
  transaction: {
    message: {
      accountKeys: string[];
      header: {
        numReadonlySignedAccounts: number;
        numReadonlyUnsignedAccounts: number;
        numRequiredSignatures: number;
      };
      instructions: SolanaInstruction[];
      recentBlockhash: string;
    };
    signatures: string[];
  };
}

export interface SolanaInstruction {
  accounts: number[];
  data: string;
  programIdIndex: number;
}

// ===================================================================
// SOLANA UTILITIES
// ===================================================================

export const formatSolanaAddress = (address: string): string => {
  if (!address || address.length < 32) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const isSolanaAddress = (address: string): boolean => {
  try {
    // Basic validation - Solana addresses are base58 encoded and typically 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  } catch {
    return false;
  }
};

export const formatSolanaAmount = (amount: string, decimals: number = 9): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return (num / Math.pow(10, decimals)).toFixed(decimals).replace(/\.?0+$/, '');
};

export const lamportsToSol = (lamports: string | number): number => {
  return Number(lamports) / 1e9;
};

export const solToLamports = (sol: string | number): number => {
  return Math.floor(Number(sol) * 1e9);
};

export const formatSolanaTokenAmount = (amount: string, decimals: number): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return (num / Math.pow(10, decimals)).toString();
};

export const getSolanaExplorerUrl = (signature: string, cluster: SolanaCluster = 'mainnet-beta'): string => {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
};

export const getSolanaAccountExplorerUrl = (address: string, cluster: SolanaCluster = 'mainnet-beta'): string => {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/account/${address}${clusterParam}`;
};
