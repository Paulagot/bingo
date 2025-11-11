# Stellar Wallet Integration

Stellar blockchain wallet integration for quiz platform entry fees and prize distribution.

## Overview

This module handles Stellar wallet connections, transactions, and balance management for the quiz platform. It supports multiple Stellar-compatible wallets and currencies, enabling fundraising rooms on the Stellar network.

## Status

✅ **Implemented**

All features are implemented and production-ready:
- ✅ Basic wallet connection (Freighter, Albedo, and other Stellar wallets)
- ✅ Balance fetching
- ✅ Transaction sending
- ✅ Error handling
- ✅ React provider
- ✅ Integration with quiz flow
- ✅ Multi-currency support (XLM, USDC, Glo USD)
- ✅ Stellar Smart Contracts (Soros) integration

## Features

### Wallet Connection
- **Freighter**: Popular Stellar wallet browser extension
- **Albedo**: Web-based Stellar wallet
- **Stellar Wallet Kit**: Multi-wallet support
- **Other Wallets**: Any Stellar-compatible wallet

### Multi-Currency Support
- **XLM**: Native Stellar token
- **USDC**: USD Coin on Stellar
- **Glo USD**: Glo USD for charitable giving
- **Custom Assets**: Any Stellar asset

### Transaction Management
- **Entry Fee Payments**: Collect entry fees from players
- **Prize Distributions**: Distribute prizes to winners
- **Charity Donations**: Send donations to charity wallets
- **Balance Tracking**: Real-time balance updates

### Network Support
- **Testnet**: Development and testing
- **Mainnet**: Production deployment

## Contract Integration

### Stellar Smart Contracts (Soros)

The Stellar integration uses Stellar Smart Contracts (Soros) for room management and prize distribution. Soros contracts provide similar functionality to Solana programs and EVM contracts.

#### Contract Structure
- **Room Contracts**: Manage individual fundraising rooms
- **Factory Contracts**: Create new room instances
- **Asset Management**: Handle prize assets and distributions

### Transaction Flow

#### Room Creation
1. Validate inputs (entry fee, host fee, prize pool)
2. Connect Stellar wallet
3. Build contract deployment transaction
4. Sign and submit transaction
5. Wait for confirmation
6. Return room contract address

#### Joining Room
1. Validate inputs (room ID, entry fee)
2. Connect Stellar wallet
3. Build payment transaction
4. Sign and submit transaction
5. Wait for confirmation
6. Return transaction hash

#### Prize Distribution
1. Validate inputs (room ID, winners)
2. Connect Stellar wallet
3. Build distribution transaction
4. Sign and submit transaction
5. Wait for confirmation
6. Return transaction hash

## Configuration

### Network Configuration

```typescript
// Testnet
export const STELLAR_TESTNET = 'https://horizon-testnet.stellar.org';

// Mainnet
export const STELLAR_MAINNET = 'https://horizon.stellar.org';
```

### Supported Assets

```typescript
// XLM (Native)
export const XLM_ASSET = {
  code: 'XLM',
  issuer: undefined, // Native asset
};

// USDC
export const USDC_ASSET = {
  code: 'USDC',
  issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
};

// Glo USD
export const GLO_USD_ASSET = {
  code: 'GLOUSD',
  issuer: 'GLO_USD_ISSUER_ADDRESS',
};
```

### Default Currency

The platform defaults to **Glo USD** for charitable giving, maximizing fundraising impact.

## Code Examples

### Wallet Connection

```typescript
import { useStellarWallet } from './useStellarWallet';

function StellarConnection() {
  const { connect, disconnect, isConnected, publicKey } = useStellarWallet();

  const handleConnect = async () => {
    try {
      await connect();
      console.log('Connected:', publicKey);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <button onClick={handleConnect}>
      {isConnected ? 'Connected' : 'Connect Wallet'}
    </button>
  );
}
```

### Room Creation

```typescript
import { useQuizContract } from './useQuizContract';

function CreateRoom() {
  const { createRoom } = useQuizContract();

  const handleCreateRoom = async () => {
    try {
      const result = await createRoom({
        roomId: 'my-room-123',
        entryFee: '1.0',
        currency: 'USDC',
        hostFeePct: 1,
        prizePoolPct: 39,
      });
      console.log('Room created:', result.contractAddress);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  return <button onClick={handleCreateRoom}>Create Room</button>;
}
```

### Joining a Room

```typescript
import { useQuizContract } from './useQuizContract';

function JoinRoom() {
  const { joinRoom } = useQuizContract();

  const handleJoinRoom = async () => {
    try {
      const result = await joinRoom({
        roomId: 'my-room-123',
        entryFee: '1.0',
        currency: 'USDC',
      });
      console.log('Joined room:', result.transactionHash);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  return <button onClick={handleJoinRoom}>Join Room</button>;
}
```

### Prize Distribution

```typescript
import { useQuizContract } from './useQuizContract';

function DistributePrizes() {
  const { distributePrizes } = useQuizContract();

  const handleDistributePrizes = async () => {
    try {
      const result = await distributePrizes({
        roomId: 'my-room-123',
        winners: ['winner1...', 'winner2...', 'winner3...'],
      });
      console.log('Prizes distributed:', result.transactionHash);
    } catch (error) {
      console.error('Failed to distribute prizes:', error);
    }
  };

  return <button onClick={handleDistributePrizes}>Distribute Prizes</button>;
}
```

## Error Handling

### Common Errors

- **InsufficientFunds**: User doesn't have enough XLM or assets
- **AccountNotFound**: Stellar account doesn't exist
- **TransactionFailed**: Transaction was rejected
- **NetworkError**: Connection to Stellar network failed

### Error Formatting

```typescript
try {
  await joinRoom({...});
} catch (error) {
  if (error.message.includes('insufficient')) {
    console.error('Insufficient funds for transaction');
  } else if (error.message.includes('account')) {
    console.error('Account not found');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Dependencies

- `@stellar/stellar-sdk` - Core Stellar blockchain interactions
- `@stellar/freighter-api` - Freighter wallet integration
- `@creit.tech/stellar-wallets-kit` - Multi-wallet support

## Usage

```typescript
import { useStellarWallet } from './useStellarWallet';
import { useQuizContract } from './useQuizContract';

function QuizPayment() {
  const { 
    connect, 
    disconnect, 
    balance, 
    isConnected, 
    publicKey
  } = useStellarWallet();
  
  const {
    createRoom,
    joinRoom,
    distributePrizes
  } = useQuizContract();
  
  // Implementation
}
```

## Transaction Details

### Stellar Transactions

Stellar transactions are atomic and include:
- **Source Account**: Transaction sender
- **Operations**: List of operations to execute
- **Time Bounds**: Transaction validity period
- **Memo**: Optional memo field
- **Fee**: Transaction fee (in stroops)

### Operation Types

- **Payment**: Send assets to another account
- **Create Account**: Create a new Stellar account
- **Change Trust**: Add trustline for an asset
- **Manage Data**: Store data on the account
- **Invoke Contract**: Call Stellar Smart Contract

## Network Configuration

### Testnet
- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`
- **Asset Issuers**: Testnet asset issuers

### Mainnet
- **Horizon URL**: `https://horizon.stellar.org`
- **Network Passphrase**: `Public Global Stellar Network ; September 2015`
- **Asset Issuers**: Mainnet asset issuers

## Reference Documentation

- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Stellar Smart Contracts (Soros)](https://soroban.stellar.org/)
- [Freighter Wallet](https://freighter.app/)
- [Stellar Wallet Kit](https://github.com/creit-tech/stellar-wallets-kit)
