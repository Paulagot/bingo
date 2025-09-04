// setup-multichain.mjs
// Run this script from your project root: node setup-multichain.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File contents
const files = {
  // TypeScript files
  'src/chains/types/index.ts': `export * from './stellar-types';
export * from './evm-types';
export * from './solana-types';

// Base interfaces that all chains will implement
export interface BaseWalletConnection {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chain: 'stellar' | 'evm' | 'solana';
  error: string | null;
}

export interface ChainProvider {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getBalance: () => Promise<string>;
  sendTransaction: (params: any) => Promise<string>;
}

export type SupportedChain = 'stellar' | 'evm' | 'solana';
`,

  'src/chains/types/stellar-types.ts': `import type { BaseWalletConnection, ChainProvider } from './index';

export interface StellarWalletConnection extends BaseWalletConnection {
  chain: 'stellar';
  publicKey?: string;
  networkPassphrase?: string;
}

export interface StellarChainProvider extends ChainProvider {
  // Stellar-specific methods will be added here
}

// Placeholder for Stellar-specific types
export interface StellarTransactionParams {
  // Will be defined when implementing Stellar integration
}
`,

  'src/chains/types/evm-types.ts': `import type { BaseWalletConnection, ChainProvider } from './index';

export interface EvmWalletConnection extends BaseWalletConnection {
  chain: 'evm';
  chainId?: number;
  ens?: string;
}

export interface EvmChainProvider extends ChainProvider {
  // EVM-specific methods will be added here
}

// Placeholder for EVM-specific types
export interface EvmTransactionParams {
  // Will be defined when implementing EVM integration
}
`,

  'src/chains/types/solana-types.ts': `import type { BaseWalletConnection, ChainProvider } from './index';

export interface SolanaWalletConnection extends BaseWalletConnection {
  chain: 'solana';
  publicKey?: string;
  cluster?: 'mainnet-beta' | 'testnet' | 'devnet';
}

export interface SolanaChainProvider extends ChainProvider {
  // Solana-specific methods will be added here
}

// Placeholder for Solana-specific types
export interface SolanaTransactionParams {
  // Will be defined when implementing Solana integration
}
`,

  'src/stores/walletStore.ts': `import { create } from 'zustand';
import type { 
  StellarWalletConnection, 
  EvmWalletConnection, 
  SolanaWalletConnection,
  SupportedChain 
} from '../chains/types';

interface WalletState {
  // Chain-specific wallet states
  stellar: StellarWalletConnection;
  evm: EvmWalletConnection;
  solana: SolanaWalletConnection;
  
  // Current active chain
  activeChain: SupportedChain | null;
  
  // Actions
  setActiveChain: (chain: SupportedChain) => void;
  updateStellarWallet: (updates: Partial<StellarWalletConnection>) => void;
  updateEvmWallet: (updates: Partial<EvmWalletConnection>) => void;
  updateSolanaWallet: (updates: Partial<SolanaWalletConnection>) => void;
  resetWallet: (chain: SupportedChain) => void;
  resetAllWallets: () => void;
}

const createInitialStellarState = (): StellarWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  chain: 'stellar',
  error: null,
  publicKey: undefined,
  networkPassphrase: undefined,
});

const createInitialEvmState = (): EvmWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  chain: 'evm',
  error: null,
  chainId: undefined,
  ens: undefined,
});

const createInitialSolanaState = (): SolanaWalletConnection => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  chain: 'solana',
  error: null,
  publicKey: undefined,
  cluster: undefined,
});

export const useWalletStore = create<WalletState>((set) => ({
  // Initial states
  stellar: createInitialStellarState(),
  evm: createInitialEvmState(),
  solana: createInitialSolanaState(),
  activeChain: null,

  // Actions
  setActiveChain: (chain) => set({ activeChain: chain }),

  updateStellarWallet: (updates) =>
    set((state) => ({
      stellar: { ...state.stellar, ...updates },
    })),

  updateEvmWallet: (updates) =>
    set((state) => ({
      evm: { ...state.evm, ...updates },
    })),

  updateSolanaWallet: (updates) =>
    set((state) => ({
      solana: { ...state.solana, ...updates },
    })),

  resetWallet: (chain) =>
    set((state) => {
      switch (chain) {
        case 'stellar':
          return { ...state, stellar: createInitialStellarState() };
        case 'evm':
          return { ...state, evm: createInitialEvmState() };
        case 'solana':
          return { ...state, solana: createInitialSolanaState() };
        default:
          return state;
      }
    }),

  resetAllWallets: () =>
    set({
      stellar: createInitialStellarState(),
      evm: createInitialEvmState(),
      solana: createInitialSolanaState(),
      activeChain: null,
    }),
}));
`,

  'src/components/chains/DynamicChainProvider.tsx': `import React, { type FC, type ReactNode } from 'react';
import type { SupportedChain } from '../../chains/types';

interface DynamicChainProviderProps {
  selectedChain: SupportedChain | null;
  children: ReactNode;
}

export const DynamicChainProvider: FC<DynamicChainProviderProps> = ({
  selectedChain,
  children,
}) => {
  // This is a placeholder implementation
  // Will be fully implemented in Phase 3
  
  if (!selectedChain) {
    // No chain selected, render children without wallet provider
    return <>{children}</>;
  }

  // TODO: Implement chain-specific provider loading
  console.log(\`DynamicChainProvider: Loading provider for \${selectedChain}\`);
  
  return <>{children}</>;
};
`,

  // README files
  'src/chains/README.md': `# Multi-Chain Wallet Integration

This directory contains chain-specific wallet implementations for the quiz platform.

## Architecture

Each chain implementation follows a consistent pattern:
- **Types**: Chain-specific TypeScript interfaces
- **Hooks**: React hooks for wallet operations  
- **Providers**: React context providers for wallet state
- **Utils**: Chain-specific utility functions

## Supported Chains

### Stellar
- **Directory**: \`./stellar/\`
- **Purpose**: Stellar blockchain wallet integration using Stellar Wallet Kit
- **Currency**: XLM, USDC, Glo USD
- **Status**: 🚧 In Development

### EVM (Ethereum Virtual Machine)
- **Directory**: \`./evm/\`
- **Purpose**: EVM-compatible chains (Ethereum, Polygon, etc.)
- **Currency**: ETH, USDC, ERC-20 tokens
- **Status**: ⏳ Planned (existing Web3Provider to be integrated)

### Solana
- **Directory**: \`./solana/\`
- **Purpose**: Solana blockchain wallet integration
- **Currency**: SOL, USDC, SPL tokens
- **Status**: ⏳ Planned

## Naming Convention

All chain-specific components, hooks, and types follow the pattern:
- \`{chain}-wallet-provider\`
- \`{chain}-connection\`
- \`{chain}-types\`

## Adding a New Chain

1. Create directory: \`src/chains/{chainName}/\`
2. Add types: \`src/chains/types/{chainName}-types.ts\`
3. Implement wallet hook: \`src/chains/{chainName}/use{ChainName}Wallet.ts\`
4. Create provider: \`src/chains/{chainName}/{ChainName}WalletProvider.tsx\`
5. Update \`DynamicChainProvider.tsx\` to include new chain
6. Update types exports in \`src/chains/types/index.ts\`
`,

  'src/chains/stellar/README.md': `# Stellar Wallet Integration

Stellar blockchain wallet integration for quiz platform entry fees and prize distribution.

## Overview

This module handles Stellar wallet connections, transactions, and balance management for the quiz platform. It supports multiple Stellar-compatible wallets and currencies.

## Features

- **Wallet Connection**: Connect to Freighter, Albedo, and other Stellar wallets
- **Multi-Currency Support**: XLM, USDC, Glo USD
- **Transaction Management**: Entry fee payments and prize distributions
- **Balance Tracking**: Real-time balance updates
- **Network Support**: Mainnet and Testnet

## Dependencies

- \`@stellar/stellar-sdk\` - Core Stellar blockchain interactions
- \`@stellar/freighter-api\` - Freighter wallet integration
- \`@creit.tech/stellar-wallets-kit\` - Multi-wallet support (alternative)

## Implementation Status

- [ ] Basic wallet connection
- [ ] Balance fetching
- [ ] Transaction sending
- [ ] Error handling
- [ ] React provider
- [ ] Integration with quiz flow

## Usage

\`\`\`typescript
import { useStellarWallet } from './useStellarWallet';

function QuizPayment() {
  const { 
    connect, 
    disconnect, 
    balance, 
    isConnected, 
    sendPayment 
  } = useStellarWallet();
  
  // Implementation
}
\`\`\`

## Configuration

- **Network**: Mainnet/Testnet selection
- **Supported Assets**: XLM, USDC, GLOUSD
- **Default Currency**: GLOUSD (for charitable giving)
`,

  'src/chains/evm/README.md': `# EVM Wallet Integration

Ethereum Virtual Machine compatible wallet integration for quiz platform.

## Overview

This module handles EVM-compatible wallet connections for multiple networks including Ethereum, Polygon, Base, Avalanche, and others.

## Features

- **Multi-Network Support**: Ethereum, Polygon, Base, Avalanche, Celo
- **Wallet Compatibility**: MetaMask, WalletConnect, Coinbase Wallet
- **Token Support**: ETH, USDC, and other ERC-20 tokens
- **Network Switching**: Automatic network detection and switching
- **Transaction Management**: Entry fees and prize distribution

## Dependencies

- \`wagmi\` - React hooks for Ethereum
- \`@reown/appkit\` - Wallet connection UI
- \`viem\` - TypeScript Ethereum library

## Integration Notes

The quiz platform already has an existing \`Web3Provider.tsx\` that handles EVM connections for non-quiz pages. This module will:

1. **Extend** the existing provider for quiz-specific functionality
2. **Reuse** existing wallet connection logic
3. **Add** quiz-specific transaction methods
4. **Maintain** backward compatibility

## Implementation Status

- [x] Basic infrastructure (existing Web3Provider)
- [ ] Quiz-specific integration
- [ ] Multi-network configuration
- [ ] Transaction handling
- [ ] Error management

## Migration Plan

1. Extract reusable logic from existing \`Web3Provider\`
2. Create \`useEvmWallet\` hook for quiz functionality
3. Update \`DynamicChainProvider\` to use existing EVM setup
4. Maintain existing functionality for non-quiz pages
`,

  'src/chains/solana/README.md': `# Solana Wallet Integration

Solana blockchain wallet integration for quiz platform entry fees and rewards.

## Overview

This module handles Solana wallet connections, SPL token transactions, and program interactions for the quiz platform.

## Features

- **Wallet Support**: Phantom, Solflare, Backpack, and other Solana wallets
- **Token Support**: SOL, USDC, and other SPL tokens
- **Program Integration**: Custom quiz smart program integration
- **Fast Transactions**: Low-cost, high-speed transaction processing
- **Cluster Support**: Mainnet, Devnet, Testnet

## Dependencies

- \`@solana/web3.js\` - Core Solana blockchain interactions
- \`@solana/wallet-adapter-react\` - React wallet adapter
- \`@solana/wallet-adapter-wallets\` - Wallet implementations
- \`@solana/spl-token\` - SPL token operations

## Implementation Status

- [ ] Wallet adapter setup
- [ ] Connection management
- [ ] SPL token operations
- [ ] Transaction building
- [ ] Program interaction
- [ ] React provider
- [ ] Quiz integration

## Usage

\`\`\`typescript
import { useSolanaWallet } from './useSolanaWallet';

function QuizPayment() {
  const { 
    connect, 
    disconnect, 
    balance, 
    isConnected, 
    sendSplToken 
  } = useSolanaWallet();
  
  // Implementation
}
\`\`\`

## Configuration

- **Cluster**: Mainnet-beta/Devnet selection
- **Supported Tokens**: SOL, USDC
- **RPC Endpoint**: Configurable RPC provider
- **Program ID**: Quiz smart program address
`
};

// Function to create directories recursively
function createDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  } else {
    console.log(`📁 Directory exists: ${dirPath}`);
  }
}

// Function to create file with content
function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  createDir(dir);
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created file: ${filePath}`);
  } else {
    console.log(`📄 File exists: ${filePath}`);
  }
}

// Main setup function
function setupMultiChain() {
  console.log('🚀 Setting up multi-chain folder structure...\n');

  // Create all directories first
  const directories = [
    'src/chains/types',
    'src/chains/stellar',
    'src/chains/evm',
    'src/chains/solana',
    'src/stores',
    'src/components/chains'
  ];

  directories.forEach(createDir);
  console.log('');

  // Create all files
  Object.entries(files).forEach(([filePath, content]) => {
    createFile(filePath, content);
  });

  console.log('\n🎉 Multi-chain setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm run typecheck (or npx tsc --noEmit)');
  console.log('2. Run: npm run dev');
  console.log('3. Verify no TypeScript errors');
  console.log('4. Proceed to Phase 1, Task 1.2\n');
}

// Run the setup
try {
  setupMultiChain();
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}