# Stellar Wallet Integration

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

- `@stellar/stellar-sdk` - Core Stellar blockchain interactions
- `@stellar/freighter-api` - Freighter wallet integration
- `@creit.tech/stellar-wallets-kit` - Multi-wallet support (alternative)

## Implementation Status

- [ ] Basic wallet connection
- [ ] Balance fetching
- [ ] Transaction sending
- [ ] Error handling
- [ ] React provider
- [ ] Integration with quiz flow

## Usage

```typescript
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
```

## Configuration

- **Network**: Mainnet/Testnet selection
- **Supported Assets**: XLM, USDC, GLOUSD
- **Default Currency**: GLOUSD (for charitable giving)
