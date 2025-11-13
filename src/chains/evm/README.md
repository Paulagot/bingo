# EVM Wallet Integration

Ethereum Virtual Machine compatible wallet integration for quiz platform.

## Overview

This module handles EVM-compatible wallet connections for multiple networks including Ethereum, Polygon, Base, Avalanche, and others. It provides a complete interface for creating fundraising rooms, joining games, and distributing prizes through deployed smart contracts.

## Status

✅ **Partially Implemented**

Implemented features:
- ✅ Basic infrastructure (existing Web3Provider)
- ✅ Multi-network configuration (Base, Polygon)
- ✅ Wallet connection (MetaMask, WalletConnect, Coinbase Wallet)
- ✅ Pool room deployment
- ✅ Asset room deployment
- ✅ Factory pattern for room creation
- ✅ Transaction handling
- ✅ Error management

In progress:
- 🚧 Enhanced error handling
- 🚧 Transaction simulation
- 🚧 Event listening and indexing

## Features

### Multi-Network Support
- **Base**: Base mainnet and Base Sepolia testnet
- **Polygon**: Polygon mainnet and Polygon Amoy testnet
- **Ethereum**: Ethereum mainnet and Sepolia testnet (planned)
- **Avalanche**: Avalanche C-Chain (planned)
- **Celo**: Celo mainnet (planned)

### Wallet Compatibility
- **MetaMask**: Most popular Ethereum wallet
- **WalletConnect**: Multi-wallet support
- **Coinbase Wallet**: Coinbase's official wallet
- **RainbowKit**: Unified wallet connection UI

### Token Support
- **ETH**: Native Ethereum token
- **USDC**: USD Coin (ERC-20)
- **Custom ERC-20 Tokens**: Any ERC-20 token

### Contract Integration
- **PoolFactory**: Factory contract for creating pool-based rooms
- **AssetFactory**: Factory contract for creating asset-based rooms
- **PoolRoom**: Individual pool room contract
- **AssetRoom**: Individual asset room contract

## Contract Architecture

### Factory Pattern

The EVM implementation uses a factory pattern for room creation:

#### PoolFactory
- **Purpose**: Creates pool-based fundraising rooms
- **Function**: `createPoolRoom(roomId, host, entryFee, hostFeeBps, prizePoolBps, ...)`
- **Returns**: Address of deployed PoolRoom contract

#### AssetFactory
- **Purpose**: Creates asset-based fundraising rooms
- **Function**: `createAssetRoom(roomId, host, prizeAssets, ...)`
- **Returns**: Address of deployed AssetRoom contract

### Room Contracts

#### PoolRoom
- **Purpose**: Manages pool-based fundraising room
- **Features**:
  - Entry fee collection
  - Player management
  - Prize distribution
  - Fund splitting (platform, host, charity, winners)

#### AssetRoom
- **Purpose**: Manages asset-based fundraising room
- **Features**:
  - Prize asset deposits
  - Player management
  - Asset distribution to winners
  - Fund splitting (platform, host, charity)

## Network Configuration

### Base
- **Mainnet**: Chain ID 8453
- **Testnet (Sepolia)**: Chain ID 84532
- **RPC**: Configurable via environment variables
- **Explorer**: https://basescan.org

### Polygon
- **Mainnet**: Chain ID 137
- **Testnet (Amoy)**: Chain ID 80002
- **RPC**: Configurable via environment variables
- **Explorer**: https://polygonscan.com

### Token Addresses

#### USDC (USD Coin - 6 decimals)
- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (native USDC)
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Circle test USDC)
- **Polygon**: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (native USDC)
- **Polygon Amoy**: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` (Circle test USDC)
- **Optimism**: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` (native USDC)
- **Optimism Sepolia**: `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` (Circle test USDC)
- **Avalanche**: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (native USDC)
- **Avalanche Fuji**: `0x5425890298aed601595a70ab815c96711a31bc65` (Circle test USDC)
- **BSC**: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (Binance-Peg USDC)
- **BSC Testnet**: `0x64544969ED7EBf5F083679233325356EBe738930` (test token)

#### USDGLO (Glo Dollar - 18 decimals)
- **Ethereum/Base/Polygon/Optimism**: `0x4F604735c1cF31399C6E711D5962b2B3E0225AD3` (same address across chains)

## Contract Integration

### Room Creation

```typescript
import { useContractActions } from '../../hooks/useContractActions';

function CreateRoom() {
  const { deploy } = useContractActions();

  const handleCreateRoom = async () => {
    try {
      const result = await deploy({
        roomId: 'my-room-123',
        hostId: 'host-address',
        entryFee: '1.0',
        hostFeePct: 1,
        prizePoolPct: 39,
        web3Chain: 'base',
        web3Currency: 'USDC',
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
import { useContractActions } from '../../hooks/useContractActions';

function JoinRoom() {
  const { joinRoom } = useContractActions();

  const handleJoinRoom = async () => {
    try {
      const result = await joinRoom({
        roomId: 'my-room-123',
        contractAddress: roomAddress,
        entryFee: '1.0',
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
import { useContractActions } from '../../hooks/useContractActions';

function DistributePrizes() {
  const { distributePrizes } = useContractActions();

  const handleDistributePrizes = async () => {
    try {
      const result = await distributePrizes({
        roomId: 'my-room-123',
        contractAddress: roomAddress,
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

## Transaction Flow

### Room Creation Flow

1. Validate inputs (entry fee, host fee, prize pool)
2. Check wallet connection
3. Get factory contract address
4. Build transaction to create room
5. Estimate gas
6. Send transaction
7. Wait for confirmation
8. Return room contract address

### Joining Room Flow

1. Validate inputs (room ID, entry fee)
2. Check wallet connection
3. Get room contract address
4. Approve token transfer (if ERC-20)
5. Build transaction to join room
6. Estimate gas
7. Send transaction
8. Wait for confirmation
9. Return transaction hash

### Prize Distribution Flow

1. Validate inputs (room ID, winners)
2. Check wallet connection
3. Get room contract address
4. Build transaction to distribute prizes
5. Estimate gas
6. Send transaction
7. Wait for confirmation
8. Return transaction hash

## Error Handling

### Common Errors

- **InsufficientFunds**: User doesn't have enough tokens or ETH
- **RoomFull**: Room has reached max players
- **RoomEnded**: Room has already ended
- **InvalidWinner**: Winner is not a player in the room
- **TransactionFailed**: Transaction reverted (check error message)

### Error Formatting

```typescript
try {
  await deploy({...});
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.error('Insufficient funds for transaction');
  } else if (error.code === 'TRANSACTION_REVERTED') {
    console.error('Transaction reverted:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Dependencies

- `wagmi` - React hooks for Ethereum
- `@reown/appkit` - Wallet connection UI
- `viem` - TypeScript Ethereum library
- `ethers` - Ethereum library (legacy support)

## Configuration

### Factory Contracts

See `src/chains/evm/config/README.md` for complete contract addresses.

#### PoolFactory
- **Base Sepolia**: `0x1407B51e43F5983B72577d1dB70AB107820c2e75` ✅ (deployed)
- **Avalanche Fuji**: `0xbD144cA5539FEBdBCf40eE24F90Ab3E608609D5d` ✅ (deployed)
- **Other Networks**: Placeholder addresses (see config files)

#### AssetFactory
- **Base Sepolia**: `0x7775A6c38347FE7284be1298FCdDB291F1A24CCe` ✅ (deployed)
- **Other Networks**: Placeholder addresses (see config files)

### RPC Endpoints

```typescript
export const RPC_ENDPOINTS = {
  'base': 'https://mainnet.base.org',
  'baseSepolia': 'https://sepolia.base.org',
  'polygon': 'https://polygon-rpc.com',
  'polygonAmoy': 'https://rpc-amoy.polygon.technology',
};
```

## Integration Notes

The quiz platform already has an existing `Web3Provider.tsx` that handles EVM connections for non-quiz pages. This module:

1. **Extends** the existing provider for quiz-specific functionality
2. **Reuses** existing wallet connection logic
3. **Adds** quiz-specific transaction methods
4. **Maintains** backward compatibility

## Usage

```typescript
import { useContractActions } from '@/hooks/useContractActions';

function QuizPayment() {
  const { 
    deploy,
    joinRoom,
    distributePrizes,
    isConnected,
    address
  } = useContractActions();
  
  // Implementation
}
```

## Migration Plan

1. ✅ Extract reusable logic from existing `Web3Provider`
2. ✅ Create `useContractActions` hook for quiz functionality
3. ✅ Update `DynamicChainProvider` to use existing EVM setup
4. ✅ Maintain existing functionality for non-quiz pages
5. 🚧 Add enhanced error handling
6. 🚧 Add transaction simulation
7. 🚧 Add event listening and indexing

## Reference Documentation

- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [RainbowKit Documentation](https://rainbowkit.com/)
- [Base Documentation](https://docs.base.org/)
- [Polygon Documentation](https://docs.polygon.technology/)
