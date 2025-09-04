// src/chains/stellar/config.ts
import { 
  StellarWalletsKit, 
  WalletNetwork, 
  sep43Modules
} from '@creit.tech/stellar-wallets-kit';
import { Horizon } from '@stellar/stellar-sdk';
import type { StellarNetwork, StellarNetworkConfig } from '../types/stellar-types';

// ===================================================================
// STELLAR NETWORK CONFIGURATION
// ===================================================================

export const stellarNetworks: Record<StellarNetwork, StellarNetworkConfig> = {
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

// Default to testnet for development, mainnet for production
export const defaultStellarNetwork: StellarNetwork = 
  import.meta.env.MODE === 'production' ? 'mainnet' : 'testnet';

export const getCurrentNetworkConfig = (network: StellarNetwork = defaultStellarNetwork): StellarNetworkConfig => {
  return stellarNetworks[network];
};

// ===================================================================
// STELLAR WALLETS KIT CONFIGURATION
// ===================================================================

export const createStellarWalletsKit = (network: StellarNetwork = defaultStellarNetwork): StellarWalletsKit => {
  const config = getCurrentNetworkConfig(network);
  
  return new StellarWalletsKit({
    network: config.networkPassphrase as WalletNetwork,
    modules: sep43Modules(),
  });
};

// ===================================================================
// HORIZON SERVER CONFIGURATION  
// ===================================================================

export const createHorizonServer = (network: StellarNetwork = defaultStellarNetwork): Horizon.Server => {
  const config = getCurrentNetworkConfig(network);
  
  return new Horizon.Server(config.horizonUrl, {
    allowHttp: config.isTestnet, // Allow HTTP for testnet only
  });
};

// ===================================================================
// STELLAR WALLET METADATA
// ===================================================================

export const stellarWalletMetadata = {
  appName: 'Quiz Platform',
  appDescription: 'Multi-chain quiz platform with crypto rewards',
  appDomain: window.location.hostname,
  appIcon: '/favicon.ico',
};

// ===================================================================
// SUPPORTED ASSETS CONFIGURATION
// ===================================================================

export const supportedAssets = {
  mainnet: [
    {
      code: 'XLM',
      isNative: true,
      name: 'Stellar Lumens',
      icon: '/icons/stellar.svg',
    },
    {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      isNative: false,
      name: 'USD Coin',
      icon: '/icons/usdc.svg',
    },
    {
      code: 'GLOUSD',
      issuer: 'GAL4GIVM6FKUACIIVI4EBTXKECR3DGB2YGD5W7KO5RTZBTXJ6FZFMHVJ',
      isNative: false,
      name: 'Glo Dollar',
      icon: '/icons/glousd.svg',
    },
  ],
  testnet: [
    {
      code: 'XLM',
      isNative: true,
      name: 'Stellar Lumens (Testnet)',
      icon: '/icons/stellar.svg',
    },
    {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      isNative: false,
      name: 'USD Coin (Testnet)',
      icon: '/icons/usdc.svg',
    },
    {
      code: 'GLOUSD',
      issuer: 'GCKFBEIYTKP5RDBWJBH6MWKUFWKKLLB4GCQJ4GGKMVAJHJ2PQOXYMKLQ',
      isNative: false,
      name: 'Glo Dollar (Testnet)',
      icon: '/icons/glousd.svg',
    },
  ],
};

export const getSupportedAssets = (network: StellarNetwork = defaultStellarNetwork) => {
  return supportedAssets[network];
};

// ===================================================================
// WALLET CONNECTION OPTIONS
// ===================================================================

export const walletConnectionOptions = {
  modalTitle: 'Connect Your Stellar Wallet',
  modalDescription: 'Choose a wallet to connect to the quiz platform',
  allowedWallets: [
    'freighter',
    'albedo', 
    'rabet',
    'lobstr',
    'xbull',
  ],
};

// ===================================================================
// STORAGE CONFIGURATION
// ===================================================================

export const stellarStorageKeys = {
  WALLET_ID: 'stellar-wallet-id',
  NETWORK: 'stellar-network',
  LAST_ADDRESS: 'stellar-last-address',
  AUTO_CONNECT: 'stellar-auto-connect',
} as const;

// ===================================================================
// POLLING CONFIGURATION
// ===================================================================

export const stellarPollingConfig = {
  WALLET_STATE_INTERVAL: 2000, // Check wallet state every 2 seconds
  BALANCE_UPDATE_INTERVAL: 10000, // Update balances every 10 seconds
  TRANSACTION_STATUS_INTERVAL: 3000, // Check transaction status every 3 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// ===================================================================
// ERROR MESSAGES
// ===================================================================

export const stellarErrorMessages = {
  WALLET_NOT_FOUND: 'Wallet extension not found. Please install and try again.',
  CONNECTION_REJECTED: 'Wallet connection was rejected. Please try again.',
  CONNECTION_FAILED: 'Failed to connect to wallet. Please try again.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  WRONG_NETWORK: 'Please switch to the correct network in your wallet.',
  NETWORK_SWITCH_FAILED: 'Failed to switch networks. Please try manually.',
  TRANSACTION_REJECTED: 'Transaction was rejected by user.',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  INSUFFICIENT_FUNDS: 'Insufficient balance to complete this transaction.',
  INVALID_ADDRESS: 'Invalid Stellar address provided.',
  INVALID_AMOUNT: 'Invalid amount specified.',
  ACCOUNT_NOT_FOUND: 'Account not found on the network.',
  UNAUTHORIZED: 'Unauthorized access to wallet.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
  TIMEOUT: 'Request timed out. Please try again.',
  ACCOUNT_NOT_FUNDED: 'Account needs to be funded with at least 1 XLM to activate.',
  TRUSTLINE_REQUIRED: 'You need to add a trustline for this asset first.',
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

export const getExplorerUrl = (
  type: 'transaction' | 'account' | 'asset',
  identifier: string,
  network: StellarNetwork = defaultStellarNetwork
): string => {
  const baseUrl = network === 'mainnet' 
    ? 'https://stellarchain.io' 
    : 'https://testnet.stellarchain.io';
    
  switch (type) {
    case 'transaction':
      return `${baseUrl}/transactions/${identifier}`;
    case 'account':
      return `${baseUrl}/accounts/${identifier}`;
    case 'asset':
      return `${baseUrl}/assets/${identifier}`;
    default:
      return baseUrl;
  }
};

export const formatStellarAssetForKit = (asset: { code: string; issuer?: string; isNative: boolean }) => {
  return asset.isNative ? 'native' : `${asset.code}:${asset.issuer}`;
};

// ===================================================================
// VALIDATION FUNCTIONS
// ===================================================================

export const isValidStellarAddress = (address: string): boolean => {
  return /^G[A-Z0-9]{55}$/.test(address) || /^M[A-Z0-9]{55}$/.test(address);
};

export const isValidAmount = (amount: string): boolean => {
  try {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= Number.MAX_SAFE_INTEGER;
  } catch {
    return false;
  }
};

// ===================================================================
// DEVELOPMENT HELPERS
// ===================================================================

export const debugStellarConfig = () => {
  console.log('🌟 Stellar Configuration Debug:', {
    defaultNetwork: defaultStellarNetwork,
    networks: stellarNetworks,
    supportedAssets: getSupportedAssets(),
    storageKeys: stellarStorageKeys,
    walletOptions: walletConnectionOptions,
  });
};