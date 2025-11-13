# Solana Wallet Integration

Solana blockchain wallet integration for quiz platform entry fees and rewards.

## Overview

This module handles Solana wallet connections, SPL token transactions, and program interactions for the quiz platform. It provides a complete interface for creating fundraising rooms, joining games, and distributing prizes through the deployed Anchor program on Solana.

## Architecture

The Solana integration uses a modular architecture with clear separation of concerns:

### Main Hook

- **`useSolanaContract.ts`**: Main orchestrator hook that composes domain-specific hooks to provide a unified interface. This hook maintains backward compatibility while internally using a modular structure.

### Modular Structure

The Solana contract hook has been refactored from a monolithic 961-line file into a modular architecture:

#### Domain Hooks (`hooks/`)

- **`useSolanaContext.ts`**: Provider detection, context creation, and memoization
- **`useSolanaAdmin.ts`**: Admin operations (config, registry, emergency controls, room recovery)
- **`useSolanaRooms.ts`**: Room operations (create pool/asset rooms, close joining, cleanup, end room)
- **`useSolanaPrizes.ts`**: Prize operations (declare winners, distribute prizes, deposit assets)
- **`useSolanaQueries.ts`**: Query operations (get room info, get player entry)

#### Type Definitions (`types/`)

- **`hook-types.ts`**: Hook-specific type definitions that extend base API types for backward compatibility
  - `JoinRoomParams`, `DeclareWinnersParams`, `EndRoomParams`
  - `RoomInfoExtended`, `PlayerEntryInfoExtended`

#### Utilities (`utils/`)

- **`hook-helpers.ts`**: Helper functions for provider detection, type conversion, and safe defaults
- **`api-wrapper.ts`**: Factory function for wrapping API functions with error handling and React memoization

### File Structure

```
src/chains/solana/
├── useSolanaContract.ts          # Main orchestrator hook (243 lines)
├── useSolanaWallet.ts            # Wallet connection and state management
├── SolanaWalletProvider.tsx      # React context provider for wallet state
├── hooks/
│   ├── useSolanaContext.ts       # Context creation and provider detection
│   ├── useSolanaAdmin.ts         # Admin operations hook
│   ├── useSolanaRooms.ts         # Room operations hook
│   ├── useSolanaPrizes.ts        # Prize operations hook
│   └── useSolanaQueries.ts       # Query operations hook
├── types/
│   └── hook-types.ts             # Hook-specific type definitions
└── utils/
    ├── hook-helpers.ts           # Helper functions
    └── api-wrapper.ts            # API wrapper factory
```

### Hook Composition Pattern

The main hook uses a composition pattern where domain hooks are combined:

```typescript
export function useSolanaContract() {
  const context = useSolanaContext();
  const admin = useSolanaAdmin();
  const rooms = useSolanaRooms();
  const prizes = useSolanaPrizes();
  const queries = useSolanaQueries();
  
  // Compose and return unified interface
  return {
    ...admin,
    ...rooms,
    ...prizes,
    ...queries,
    // Connection state
    publicKey: context.publicKey,
    connected: context.connected,
    isReady: context.isReady,
  };
}
```

### Shared Utilities

All shared utilities are in `src/shared/lib/solana/`:
- **`config.ts`**: Network configuration, program ID, token mints, PDA seeds
- **`transaction-helpers.ts`**: Transaction simulation, validation, error formatting
- **`pda.ts`**: PDA derivation utilities
- **`token-accounts.ts`**: Token account management
- **`transactions.ts`**: Transaction building and sending

### API Modules

All contract operations are in `src/features/web3/solana/api/`:
- **`admin/`**: Admin operations (initialize config, add tokens, recover room, etc.)
- **`room/`**: Room operations (create pool/asset rooms, get info, cleanup, close joining)
- **`player/`**: Player operations (join room, get entry)
- **`prizes/`**: Prize operations (distribute, deposit assets, declare winners, end room)

### Implementation Details

Low-level implementations are in `src/features/web3/solana/lib/`:
- **`solana-asset-room.ts`**: Asset room specific logic

## Status

✅ **Fully Implemented**

All features are implemented and production-ready:
- ✅ Wallet adapter setup (Phantom, Solflare, Backpack, etc.)
- ✅ Connection management
- ✅ SPL token operations
- ✅ Transaction building and simulation
- ✅ Program interaction (room creation, joining, prize distribution)
- ✅ React provider integration
- ✅ Quiz integration
- ✅ Automatic token account creation
- ✅ Prize distribution with token account management
- ✅ Transaction validation and error handling
- ✅ Modular architecture with domain-specific hooks

## Features

### Wallet Support
- **Phantom**: Most popular Solana wallet
- **Solflare**: Browser and mobile wallet
- **Backpack**: Modern Solana wallet
- **Glow**: User-friendly Solana wallet
- **Slope**: Mobile-first wallet
- **Sollet**: Legacy wallet support

### Token Support
- **SOL**: Native Solana token
- **USDC**: USD Coin (Circle)
- **PYUSD**: PayPal USD
- **USDT**: Tether USD
- **Custom SPL Tokens**: Any approved token in the registry

### Network Support
- **Devnet**: Development and testing
- **Testnet**: Pre-production testing
- **Mainnet-beta**: Production deployment

### Program Integration
- **Program ID**: `8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i` (devnet)
- **Anchor Framework**: Type-safe program interactions
- **IDL**: Auto-generated TypeScript types from Rust program

## Contract Integration

### Program Architecture

The Solana program is built using the Anchor framework and implements a comprehensive fundraising platform. The program structure includes:

#### State Accounts
- **GlobalConfig**: Platform-wide configuration (platform wallet, charity wallet, fee structure)
- **Room**: Individual game room state (host, fees, players, prize distribution)
- **RoomVault**: SPL token account holding room funds
- **PlayerEntry**: Player participation record
- **TokenRegistry**: Approved tokens for room creation

#### Instructions
- **Admin**: `initialize`, `update_global_config`, `set_emergency_pause`, `recover_room`
- **Room Management**: `init_pool_room`, `init_asset_room`, `close_joining`, `cleanup_room`
- **Player Operations**: `join_room`
- **Game Execution**: `declare_winners`, `end_room`
- **Asset Management**: `add_prize_asset`

### Program Derived Addresses (PDAs)

All accounts use PDAs for security and determinism. PDA derivation utilities are in `@/shared/lib/solana/pda`:

```typescript
import { deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA } from '@/shared/lib/solana/pda';

// Room PDA
const [room] = deriveRoomPDA(hostPubkey, roomId);

// RoomVault PDA
const [roomVault] = deriveRoomVaultPDA(roomPubkey);

// PlayerEntry PDA
const [playerEntry] = derivePlayerEntryPDA(roomPubkey, playerPubkey);
```

### Economic Model

The Solana program enforces a trustless economic model:

#### Fee Allocation (Entry Fees)
```
Platform Fee:  20% (fixed by GlobalConfig)
Host Allocation: 40% total (configurable within this limit)
  - Host Fee:   0-5% (host chooses)
  - Prize Pool: 0-35% (calculated as 40% - host fee)
Charity:       Minimum 40% (calculated remainder)
```

#### Extras Allocation
```
All extras (beyond entry fee) go 100% to charity
This maximizes fundraising impact and is transparent to all participants
```

#### Distribution Calculation
```typescript
const platformFee = totalEntryFees * 0.20;
const hostFee = totalEntryFees * (hostFeeBps / 10000);
const prizeAmount = totalEntryFees * (prizePoolBps / 10000);
const charityFromEntry = totalEntryFees - platformFee - hostFee - prizeAmount;
const totalCharity = charityFromEntry + totalExtrasFees;
```

## Prize Distribution Mechanics

### Distribution Flow

1. **Host Declares Winners**: Host calls `declareWinners` with winner list
2. **Token Account Validation**: System checks if all recipient token accounts exist
3. **Automatic Account Creation**: Missing token accounts are created automatically
4. **Fund Distribution**: Smart contract distributes funds from room vault
5. **Transaction Simulation**: Transaction is simulated before execution
6. **Event Emission**: `RoomEnded` event is emitted for transparency

### Token Account Creation

The system automatically handles token account creation for all recipients:

#### Recipients
- **Host Token Account**: Created if missing before prize distribution
- **Platform Token Account**: Created if missing before prize distribution
- **Charity Token Account**: Created if missing before prize distribution
- **Winner Token Accounts**: Created if missing for each winner
- **Prize Asset Accounts**: Created if missing for asset-based rooms

All account creation instructions are included in the same transaction as prize distribution, ensuring atomic execution.

## Transaction Safety

### Transaction Simulation

All transactions are simulated before execution to prevent failures. Simulation utilities are in `@/shared/lib/solana/transaction-helpers`.

### Input Validation

All inputs are validated before transaction building:

```typescript
// Prize pool validation
const maxPrizePoolBps = 4000 - hostFeeBps; // 40% - host fee
if (prizePoolBps > maxPrizePoolBps) {
  throw new Error(`Prize pool cannot exceed ${maxPrizePoolBps / 100}%`);
}
```

### Error Handling

Common errors are caught and formatted for user feedback. Error formatting utilities are in `@/shared/lib/solana/transaction-helpers`.

## Code Examples

### Room Creation

```typescript
import { useSolanaContract } from '@/chains/solana/useSolanaContract';

function CreateRoom() {
  const { createPoolRoom } = useSolanaContract();

  const handleCreateRoom = async () => {
    try {
      const result = await createPoolRoom({
        roomId: 'my-room-123',
        entryFee: new BN(1_000_000), // 1 USDC (6 decimals)
        hostFeeBps: 100, // 1%
        prizePoolBps: 3900, // 39% (max with 1% host fee)
        maxPlayers: 100,
        feeTokenMint: USDC_MINT,
        charityWallet: charityAddress,
        prizeDistribution: [50, 30, 20], // 50% 1st, 30% 2nd, 20% 3rd
      });
      console.log('Room created:', result.room);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  return <button onClick={handleCreateRoom}>Create Room</button>;
}
```

### Joining a Room

```typescript
import { useSolanaContract } from '@/chains/solana/useSolanaContract';

function JoinRoom() {
  const { joinRoom } = useSolanaContract();

  const handleJoinRoom = async () => {
    try {
      const result = await joinRoom({
        roomId: 'my-room-123',
        // Optional: provide these to avoid on-chain lookups
        hostPubkey: hostKey,
        entryFee: new BN(1_000_000),
        feeTokenMint: USDC_MINT,
        extrasAmount: new BN(500_000), // Optional extra donation
      });
      console.log('Joined room:', result.signature);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  return <button onClick={handleJoinRoom}>Join Room</button>;
}
```

### Prize Distribution

```typescript
import { useSolanaContract } from '@/chains/solana/useSolanaContract';

function DistributePrizes() {
  const { declareWinners, distributePrizes } = useSolanaContract();

  const handleDistributePrizes = async () => {
    try {
      // First declare winners
      await declareWinners({
        roomId: 'my-room-123',
        hostPubkey: myPublicKey,
        winners: [winner1, winner2, winner3],
      });

      // Then distribute prizes
      const result = await distributePrizes({
        roomId: 'my-room-123',
        winners: [winner1, winner2, winner3],
      });
      console.log('Prizes distributed:', result.signature);
    } catch (error) {
      console.error('Failed to distribute prizes:', error);
    }
  };

  return <button onClick={handleDistributePrizes}>Distribute Prizes</button>;
}
```

### Asset-Based Rooms

```typescript
import { useSolanaContract } from '@/chains/solana/useSolanaContract';

function CreateAssetRoom() {
  const { createAssetRoom, depositPrizeAsset } = useSolanaContract();

  const handleCreateAssetRoom = async () => {
    try {
      // Create asset room
      const result = await createAssetRoom({
        roomId: 'nft-raffle',
        entryFee: new BN(1_000_000), // Entry fee for platform/host/charity
        maxPlayers: 50,
        feeTokenMint: USDC_MINT,
        charityWallet: charityAddress,
      });
      console.log('Asset room created:', result.room);

      // Deposit prize assets
      await depositPrizeAsset({
        roomId: 'nft-raffle',
        assetMint: nftMint,
        amount: new BN(1), // 1 NFT
      });
    } catch (error) {
      console.error('Failed to create asset room:', error);
    }
  };

  return <button onClick={handleCreateAssetRoom}>Create Asset Room</button>;
}
```

## Configuration

### Program ID

Configuration is in `@/shared/lib/solana/config`:

```typescript
import { PROGRAM_ID } from '@/shared/lib/solana/config';

// Devnet Program ID
// 8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i
```

### RPC Endpoints

```typescript
import { getRpcEndpoint, NETWORK } from '@/shared/lib/solana/config';

// Get RPC endpoint for current network
const endpoint = getRpcEndpoint(NETWORK);
```

### Token Mints

```typescript
import { getTokenMints } from '@/shared/lib/solana/config';

// Get token mints for current network
const { USDC, PYUSD, USDT, SOL } = getTokenMints();
```

### Fee Configuration

```typescript
// Fee structure is enforced on-chain
// Platform: 20% (fixed)
// Host: 0-5% (configurable)
// Prize Pool: 0-35% (max = 40% - host fee)
// Charity: Minimum 40% (remainder)
```

## Error Handling

### Common Errors

- **AccountNotInitialized**: Token account doesn't exist (automatically created)
- **InsufficientFunds**: User doesn't have enough tokens
- **RoomExpired**: Room has expired
- **RoomFull**: Room has reached max players
- **InvalidWinner**: Winner is not a player in the room
- **HostCannotWin**: Host cannot be a winner

### Error Formatting

Error formatting utilities are in `@/shared/lib/solana/transaction-helpers`:

```typescript
import { formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

try {
  await createPoolRoom({...});
} catch (error) {
  const formatted = formatTransactionError(error);
  console.error(formatted.message);
}
```

## Transaction Flow

### Room Creation Flow

1. Validate inputs (entry fee, host fee, prize pool)
2. Derive Room PDA
3. Derive RoomVault PDA
4. Fetch GlobalConfig for charity wallet
5. Build `init_pool_room` instruction
6. Simulate transaction
7. Send transaction
8. Confirm transaction
9. Return room address

### Joining Room Flow

1. Validate inputs (room ID, entry fee)
2. Fetch room account (or use provided room PDA)
3. Validate room state (not ended, not full)
4. Derive PlayerEntry PDA
5. Get user's token account
6. Build `join_room` instruction
7. Simulate transaction
8. Send transaction
9. Confirm transaction
10. Return transaction signature

### Prize Distribution Flow

1. Validate inputs (room ID, winners)
2. Fetch room account
3. Validate room state (not already ended)
4. Declare winners (optional, for transparency)
5. Check token account existence for all recipients
6. Create missing token accounts
7. Build `end_room` instruction
8. Simulate transaction
9. Send transaction
10. Confirm transaction
11. Return transaction signature

## Dependencies

- `@solana/web3.js` - Core Solana blockchain interactions
- `@solana/wallet-adapter-react` - React wallet adapter
- `@solana/wallet-adapter-wallets` - Wallet implementations
- `@solana/spl-token` - SPL token operations
- `@coral-xyz/anchor` - Anchor framework for program interactions

## Import Paths

### Main Hook (Recommended)

```typescript
import { useSolanaContract } from '@/chains/solana/useSolanaContract';

const {
  createPoolRoom,
  createAssetRoom,
  joinRoom,
  distributePrizes,
  getRoomInfo,
  getPlayerEntry,
  // ... all other operations
} = useSolanaContract();
```

### Domain Hooks (Advanced)

For advanced use cases, you can use domain hooks directly:

```typescript
import { useSolanaAdmin } from '@/chains/solana/hooks/useSolanaAdmin';
import { useSolanaRooms } from '@/chains/solana/hooks/useSolanaRooms';
import { useSolanaPrizes } from '@/chains/solana/hooks/useSolanaPrizes';
import { useSolanaQueries } from '@/chains/solana/hooks/useSolanaQueries';

// Use specific domain hooks
const admin = useSolanaAdmin();
const rooms = useSolanaRooms();
```

### Shared Utilities

```typescript
// Configuration
import { PROGRAM_ID, NETWORK, getTokenMints, PDA_SEEDS } from '@/shared/lib/solana/config';

// Transaction helpers
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

// PDA derivation
import { deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA } from '@/shared/lib/solana/pda';

// Token accounts
import { getOrCreateATA, getAssociatedTokenAccountAddress } from '@/shared/lib/solana/token-accounts';

// Transactions
import { buildTransaction, sendWithRetry } from '@/shared/lib/solana/transactions';
```

### API Modules (Direct Usage)

For non-React contexts or advanced use cases:

```typescript
import { createPoolRoom } from '@/features/web3/solana/api/room';
import { joinRoom } from '@/features/web3/solana/api/player';
import { distributePrizes } from '@/features/web3/solana/api/prizes';
import { initializeGlobalConfig } from '@/features/web3/solana/api/admin';

// Create context
const context: SolanaContractContext = {
  program,
  provider,
  publicKey,
  connected: !!publicKey,
  isReady: !!program && !!provider && !!publicKey,
  connection,
};

// Use API modules directly
const result = await createPoolRoom(context, params);
await joinRoom(context, joinParams);
await distributePrizes(context, prizeParams);
```

## IDL Management

The frontend IDL (`src/idl/solana_bingo.json`) must match the deployed contract. Use these scripts to keep it in sync:

### Sync IDL from Contracts

```bash
npm run sync-idl
```

This copies the IDL from `C:/Users/isich/bingo-solana-contracts/bingo/target/idl/bingo.json` to the frontend.

### Verify IDL Compatibility

```bash
npm run verify-idl
```

This checks:
- Program ID matches
- Instruction names and discriminators match
- PDA seeds match frontend constants
- Account structures are compatible

## Reference Documentation

- [Solana Program Source Code](../../../../bingo-solana-contracts/bingo/programs/bingo/src/lib.rs)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)

## Recent Updates

### Modular Architecture Refactoring
- **Change**: Refactored `useSolanaContract.ts` from 961 lines to 243 lines
- **Structure**: Split into domain hooks (admin, rooms, prizes, queries), types, and utilities
- **Impact**: Improved maintainability, better code organization, enhanced documentation
- **Compatibility**: 100% backward compatible - no changes needed to existing code

### Token Account Creation
- **Issue**: Prize distribution failed when recipient token accounts didn't exist
- **Fix**: Automatic token account creation before prize distribution
- **Impact**: Prize distribution now works even when token accounts don't exist

### Prize Pool Validation
- **Issue**: Prize pool validation was hardcoded to 35% maximum
- **Fix**: Dynamic calculation based on host fee (max prize pool = 40% - host fee)
- **Impact**: Hosts can now allocate up to 39% for prizes when host fee is 1%

### Charity Wallet Handling
- **Issue**: Charity wallet was defaulting to user's wallet
- **Fix**: Priority-based retrieval (GlobalConfig > params > error)
- **Impact**: Proper charity wallet is now used for all distributions
