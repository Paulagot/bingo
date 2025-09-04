// src/chains/types/evm-types.ts
import type { 
  BaseWalletConnection, 
  ChainProvider, 
  TransactionParams,
  TransactionResult,
  
  WalletConnectionResult
} from './index';

// ===================================================================
// EVM WALLET CONNECTION
// ===================================================================

export interface EvmWalletConnection extends BaseWalletConnection {
  chain: 'evm';
  chainId?: number;
  ens?: string;
  walletType?: EvmWalletType;
  isMultiChain?: boolean;
}

export type EvmWalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'rainbow' | 'injected';

export interface EvmWalletInfo {
  name: string;
  icon: string;
  downloadUrl?: string;
  isInjected: boolean;
  rdns?: string;
}

// ===================================================================
// EVM CHAIN PROVIDER
// ===================================================================

export interface EvmChainProvider extends ChainProvider {
  // EVM-specific connection methods
  connectWithWallet: (walletType: EvmWalletType) => Promise<WalletConnectionResult>;
  switchChain: (chainId: number) => Promise<boolean>;
  addChain: (chainConfig: EvmChainConfig) => Promise<boolean>;
  
  // Contract interactions
  callContract: (params: EvmContractCallParams) => Promise<any>;
  estimateGas: (params: EvmTransactionParams) => Promise<string>;
  
  // Token operations
  addToken: (tokenConfig: EvmTokenConfig) => Promise<boolean>;
  getTokenBalance: (tokenAddress: string) => Promise<string>;
  approveToken: (params: EvmTokenApprovalParams) => Promise<TransactionResult>;
  
  // Transaction methods
  sendTransaction: (params: EvmTransactionParams) => Promise<TransactionResult>;
  sendTokenTransfer: (params: EvmTokenTransferParams) => Promise<TransactionResult>;
  
  // Network info
  getChainId: () => Promise<number>;
  getBlockNumber: () => Promise<number>;
  getGasPrice: () => Promise<string>;
}

// ===================================================================
// EVM NETWORKS
// ===================================================================

export interface EvmChainConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
}

export const EVM_CHAINS: Record<string, EvmChainConfig> = {
  ethereum: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum.publicnode.com'],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  polygon: {
    chainId: 137,
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  base: {
    chainId: 8453,
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  avalanche: {
    chainId: 43114,
    chainName: 'Avalanche C-Chain',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
  },
  celo: {
    chainId: 42220,
    chainName: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://explorer.celo.org'],
  },
};

// ===================================================================
// EVM TRANSACTIONS
// ===================================================================

export interface EvmTransactionParams extends TransactionParams {
  from?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  type?: number; // EIP-1559 transaction type
}

export interface EvmTokenTransferParams extends EvmTransactionParams {
  tokenAddress: string;
  recipient: string;
  amount: string;
}

export interface EvmTokenApprovalParams extends EvmTransactionParams {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
}

export interface EvmContractCallParams {
  contractAddress: string;
  abi: any[];
  methodName: string;
  parameters?: any[];
  value?: string;
}

export interface EvmTokenConfig {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}


