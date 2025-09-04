# Solana Wallet Integration

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

- `@solana/web3.js` - Core Solana blockchain interactions
- `@solana/wallet-adapter-react` - React wallet adapter
- `@solana/wallet-adapter-wallets` - Wallet implementations
- `@solana/spl-token` - SPL token operations

## Implementation Status

- [ ] Wallet adapter setup
- [ ] Connection management
- [ ] SPL token operations
- [ ] Transaction building
- [ ] Program interaction
- [ ] React provider
- [ ] Quiz integration

## Usage

```typescript
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
```

## Configuration

- **Cluster**: Mainnet-beta/Devnet selection
- **Supported Tokens**: SOL, USDC
- **RPC Endpoint**: Configurable RPC provider
- **Program ID**: Quiz smart program address
