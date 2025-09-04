
// src/chains/types/stellar-types.ts - Remove unused imports
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
// STELLAR WALLET CONNECTION  
// ===================================================================

export interface StellarWalletConnection extends BaseWalletConnection {
  chain: 'stellar';
  publicKey?: string;
  networkPassphrase?: string;
  walletType?: StellarWalletType;
  sequence?: string;
  accountExists?: boolean;
}

export type StellarWalletType = 'freighter' | 'albedo' | 'rabet' | 'lobstr' | 'xbull';

export const STELLAR_WALLET_TYPES: Record<StellarWalletType, StellarWalletInfo> = {
  freighter: {
    name: 'Freighter',
    icon: '/icons/freighter.svg',
    downloadUrl: 'https://freighter.app/',
    isExtension: true,
  },
  albedo: {
    name: 'Albedo',
    icon: '/icons/albedo.svg',
    downloadUrl: 'https://albedo.link/',
    isExtension: false,
  },
  rabet: {
    name: 'Rabet',
    icon: '/icons/rabet.svg',
    downloadUrl: 'https://rabet.io/',
    isExtension: true,
  },
  lobstr: {
    name: 'LOBSTR',
    icon: '/icons/lobstr.svg',
    downloadUrl: 'https://lobstr.co/',
    isExtension: false,
  },
  xbull: {
    name: 'xBull',
    icon: '/icons/xbull.svg',
    downloadUrl: 'https://xbull.app/',
    isExtension: true,
  },
};

export interface StellarWalletInfo {
  name: string;
  icon: string;
  downloadUrl: string;
  isExtension: boolean;
}

// ===================================================================
// STELLAR CHAIN PROVIDER
// ===================================================================

export interface StellarChainProvider extends ChainProvider {
  // Stellar-specific connection methods
  connectWithWallet: (walletType: StellarWalletType) => Promise<WalletConnectionResult>;
  switchNetwork: (network: StellarNetwork) => Promise<boolean>;
  
  // Stellar account operations
  createAccount: (startingBalance?: string) => Promise<StellarAccountResult>;
  trustAsset: (asset: StellarAsset) => Promise<TransactionResult>;
  changeTrust: (asset: StellarAsset, limit?: string) => Promise<TransactionResult>;
  
  // Stellar-specific transaction methods
  sendPayment: (params: StellarPaymentParams) => Promise<TransactionResult>;
  sendPathPayment: (params: StellarPathPaymentParams) => Promise<TransactionResult>;
  createOffer: (params: StellarOfferParams) => Promise<TransactionResult>;
  
  // Asset and balance operations
  getAssetBalance: (asset: StellarAsset) => Promise<string>;
  getAccountBalances: () => Promise<StellarBalance[]>;
  getAssetInfo: (asset: StellarAsset) => Promise<StellarAssetInfo>;
  
  // Network and transaction info
  getNetworkInfo: () => Promise<StellarNetworkInfo>;
  getTransactionHistory: (limit?: number) => Promise<StellarTransaction[]>;
  getLedgerInfo: () => Promise<StellarLedgerInfo>;
}

// ===================================================================
// STELLAR NETWORK
// ===================================================================

export type StellarNetwork = 'mainnet' | 'testnet';

export interface StellarNetworkInfo extends NetworkInfo {
  networkPassphrase: string;
  horizonUrl: string;
  stellarCoreVersion: string;
  historyLatestLedger: number;
  networkId: string;
}

export const STELLAR_NETWORKS: Record<StellarNetwork, StellarNetworkConfig> = {
  mainnet: {
    // networkPassphrase: 'Public Global Stellar Network ; September 2015',
    // horizonUrl: 'https://horizon.stellar.org',
    // networkId: 'mainnet',
    // isTestnet: false,
     networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkId: 'testnet', 
    isTestnet: true,
  },
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkId: 'testnet', 
    isTestnet: true,
  },
};

export interface StellarNetworkConfig {
  networkPassphrase: string;
  horizonUrl: string;
  networkId: string;
  isTestnet: boolean;
}

// ===================================================================
// STELLAR ASSETS
// ===================================================================

export interface StellarAsset {
  code: string;
  issuer?: string; // undefined for native XLM
  isNative: boolean;
  domain?: string;
  image?: string;
}

export interface StellarAssetInfo extends StellarAsset {
  totalSupply?: string;
  circulatingSupply?: string;
  marketCap?: number;
  price?: number;
  change24h?: number;
  volume24h?: number;
  holders?: number;
}

export interface StellarBalance {
  asset: StellarAsset;
  balance: string;
  limit?: string;
  buyingLiabilities?: string;
  sellingLiabilities?: string;
  authorized?: boolean;
  clawbackEnabled?: boolean;
}

// Common Stellar assets
export const STELLAR_ASSETS: Record<string, StellarAsset> = {
  XLM: {
    code: 'XLM',
    isNative: true,
  },
  USDC: {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    isNative: false,
    domain: 'centre.io',
  },
  GLOUSD: {
    code: 'GLOUSD',
    issuer: 'GAL4GIVM6FKUACIIVI4EBTXKECR3DGB2YGD5W7KO5RTZBTXJ6FZFMHVJ',
    isNative: false,
    domain: 'glodollar.org',
  },
};

// Continue with rest of stellar types... (keeping the same as before)
export interface StellarTransactionParams extends TransactionParams {
  asset?: StellarAsset;
  destinationTag?: string;
  sourceAccount?: string;
  sequence?: string;
  fee?: string;
  timeBounds?: {
    minTime: number;
    maxTime: number;
  };
}

export interface StellarPaymentParams extends StellarTransactionParams {
  asset: StellarAsset;
  path?: StellarAsset[]; // For path payments
}

export interface StellarPathPaymentParams extends StellarTransactionParams {
  sendAsset: StellarAsset;
  sendMax: string;
  destAsset: StellarAsset;
  destAmount: string;
  path?: StellarAsset[];
}

export interface StellarOfferParams extends StellarTransactionParams {
  selling: StellarAsset;
  buying: StellarAsset;
  amount: string;
  price: string | { numerator: number; denominator: number };
  offerId?: string; // For updating existing offers
}

export interface StellarAccountResult {
  success: boolean;
  accountId?: string;
  sequence?: string;
  error?: string;
}

export interface StellarAccountInfo extends AccountInfo {
  sequence: string;
  subentryCount: number;
  thresholds: {
    lowThreshold: number;
    medThreshold: number;
    highThreshold: number;
  };
  flags: {
    authRequired: boolean;
    authRevocable: boolean;
    authImmutable: boolean;
    authClawbackEnabled: boolean;
  };
  balances: StellarBalance[];
  signers: StellarSigner[];
  data: Record<string, string>;
  sponsoring?: string;
  sponsored?: number;
  numSponsored?: number;
  numSponsoring?: number;
}

export interface StellarSigner {
  key: string;
  weight: number;
  type: string;
}

export interface StellarTransaction {
  id: string;
  hash: string;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  operationCount: number;
  envelope: string;
  result: string;
  resultCode: number;
  feeCharged: string;
  maxFee: string;
  successful: boolean;
  operations: StellarOperation[];
}

export interface StellarOperation {
  id: string;
  type: StellarOperationType;
  createdAt: string;
  transactionHash: string;
  sourceAccount?: string;
  // Operation-specific data
  [key: string]: any;
}

export enum StellarOperationType {
  CREATE_ACCOUNT = 'create_account',
  PAYMENT = 'payment',
  PATH_PAYMENT_STRICT_RECEIVE = 'path_payment_strict_receive',
  PATH_PAYMENT_STRICT_SEND = 'path_payment_strict_send',
  MANAGE_BUY_OFFER = 'manage_buy_offer',
  MANAGE_SELL_OFFER = 'manage_sell_offer',
  CREATE_PASSIVE_SELL_OFFER = 'create_passive_sell_offer',
  SET_OPTIONS = 'set_options',
  CHANGE_TRUST = 'change_trust',
  ALLOW_TRUST = 'allow_trust',
  ACCOUNT_MERGE = 'account_merge',
  INFLATION = 'inflation',
  MANAGE_DATA = 'manage_data',
  BUMP_SEQUENCE = 'bump_sequence',
  CREATE_CLAIMABLE_BALANCE = 'create_claimable_balance',
  CLAIM_CLAIMABLE_BALANCE = 'claim_claimable_balance',
  BEGIN_SPONSORING_FUTURE_RESERVES = 'begin_sponsoring_future_reserves',
  END_SPONSORING_FUTURE_RESERVES = 'end_sponsoring_future_reserves',
  REVOKE_SPONSORSHIP = 'revoke_sponsorship',
  CLAWBACK = 'clawback',
  CLAWBACK_CLAIMABLE_BALANCE = 'clawback_claimable_balance',
  SET_TRUST_LINE_FLAGS = 'set_trust_line_flags',
  LIQUIDITY_POOL_DEPOSIT = 'liquidity_pool_deposit',
  LIQUIDITY_POOL_WITHDRAW = 'liquidity_pool_withdraw',
}

export interface StellarLedgerInfo {
  sequence: number;
  hash: string;
  prevHash: string;
  transactionCount: number;
  operationCount: number;
  closedAt: string;
  totalCoins: string;
  feePool: string;
  baseFee: number;
  baseReserve: number;
  maxTxSetSize: number;
}

// Utility functions
export const formatStellarAddress = (address: string): string => {
  if (!address || address.length !== 56) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const isStellarAddress = (address: string): boolean => {
  return /^G[A-Z0-9]{55}$/.test(address) || /^M[A-Z0-9]{55}$/.test(address);
};

export const formatStellarAmount = (amount: string, decimals: number = 7): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};

export const stellarAssetToString = (asset: StellarAsset): string => {
  return asset.isNative ? 'XLM' : `${asset.code}:${asset.issuer}`;
};

export const parseStellarAsset = (assetString: string): StellarAsset => {
  if (assetString === 'XLM' || assetString === 'native') {
    return STELLAR_ASSETS.XLM;
  }
  
  const [code, issuer] = assetString.split(':');
  return {
    code,
    issuer,
    isNative: false,
  };
};
