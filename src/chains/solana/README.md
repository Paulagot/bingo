# Solana Wallet Integration

Solana blockchain wallet integration for quiz platform entry fees and rewards.

## Overview

This module handles Solana wallet connections, SPL token transactions, and program interactions for the quiz platform. It provides a complete interface for creating fundraising rooms, joining games, and distributing prizes through the deployed Anchor program on Solana.

## Architecture

The Solana integration has been modularized following Feature-Sliced Design (FSD) principles:

- **`useSolanaContract.ts`**: Main React hook that delegates to API modules
- **`SolanaWalletProvider.tsx`**: React context provider for wallet state
- **`useSolanaWallet.ts`**: Wallet connection and state management hook
- **`config.ts`**: Re-exports from `@/shared/lib/solana/config` (deprecated, use shared location)

### Shared Utilities

All shared utilities have been moved to `src/shared/lib/solana/`:
- **`config.ts`**: Network configuration, program ID, token mints, PDA seeds
- **`transaction-helpers.ts`**: Transaction simulation, validation, error formatting
- **`pda.ts`**: PDA derivation utilities
- **`token-accounts.ts`**: Token account management
- **`transactions.ts`**: Transaction building and sending

### API Modules

All contract operations are extracted to `src/features/web3/solana/api/`:
- **`admin/`**: Admin operations (initialize config, add tokens, etc.)
- **`room/`**: Room operations (create, get info, cleanup)
- **`player/`**: Player operations (join room, get entry)
- **`prizes/`**: Prize operations (distribute, deposit assets, declare winners)

### Implementation Details

Low-level implementations are in `src/features/web3/solana/lib/`:

### Migration Scripts

One-time migration scripts are in `scripts/solana/`:
- **`cleanup-old-registry.ts`**: Cleanup utility for old token registry accounts

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

All accounts use PDAs for security and determinism:

```typescript
// GlobalConfig PDA
const [globalConfig] = PublicKey.findProgramAddressSync(
  [Buffer.from('global-config')],
  PROGRAM_ID
);

// Room PDA
const [room] = PublicKey.findProgramAddressSync(
  [Buffer.from('room'), host.toBuffer(), Buffer.from(roomId)],
  PROGRAM_ID
);

// RoomVault PDA
const [roomVault] = PublicKey.findProgramAddressSync(
  [Buffer.from('room-vault'), room.toBuffer()],
  PROGRAM_ID
);

// PlayerEntry PDA
const [playerEntry] = PublicKey.findProgramAddressSync(
  [Buffer.from('player-entry'), room.toBuffer(), player.toBuffer()],
  PROGRAM_ID
);
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

#### Implementation

```typescript
// Helper function to check and create token accounts
const ensureTokenAccountExists = async (
  tokenAccount: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  accountName: string
): Promise<TransactionInstruction | null> => {
  try {
    // Check if account exists
    const account = await getAccount(connection, tokenAccount, 'confirmed');
    // Verify it's for the correct mint
    if (!account.mint.equals(mint)) {
      throw new Error(`Token account exists but for wrong mint`);
    }
    return null; // Account exists
  } catch (error) {
    // Account doesn't exist, create it
    if (error.name === 'TokenAccountNotFoundError') {
      return createAssociatedTokenAccountInstruction(
        payer,        // Host (pays for account creation)
        tokenAccount, // ATA address
        owner,        // Account owner
        mint          // Token mint
      );
    }
    throw error;
  }
};
```

#### Transaction Structure

```typescript
// 1. Check and create token accounts
const tokenAccountCreationInstructions = [];
// ... check all accounts and collect creation instructions

// 2. Add creation instructions to transaction
tokenAccountCreationInstructions.forEach(ix => tx.add(ix));

// 3. Add endRoom instruction
const endRoomIx = await program.methods
  .endRoom(roomId, winners)
  .accounts({...})
  .instruction();
tx.add(endRoomIx);

// 4. Simulate and send
await simulateTransaction(connection, tx);
await sendTransaction(tx);
```

## Transaction Safety

### Transaction Simulation

All transactions are simulated before execution to prevent failures:

```typescript
const simResult = await simulateTransaction(connection, tx);
if (!simResult.success) {
  throw new Error(`Transaction would fail: ${simResult.error}`);
}
```

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

Common errors are caught and formatted for user feedback:

```typescript
try {
  await distributePrizes({ roomId, winners });
} catch (error) {
  const formattedError = formatTransactionError(error);
  console.error(formattedError.message);
}
```

## Code Examples

### Room Creation

```typescript
import { useSolanaContract } from './useSolanaContract';

function CreateRoom() {
  const { createPoolRoom } = useSolanaContract();

  const handleCreateRoom = async () => {
    try {
      const result = await createPoolRoom({
        roomId: 'my-room-123',
        entryFee: 1.0, // 1 USDC
        hostFeeBps: 100, // 1%
        prizePoolBps: 3900, // 39% (max with 1% host fee)
        maxPlayers: 100,
        feeTokenMint: USDC_MINT,
        charityWallet: charityAddress,
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
import { useSolanaContract } from './useSolanaContract';

function JoinRoom() {
  const { joinRoom } = useSolanaContract();

  const handleJoinRoom = async () => {
    try {
      const result = await joinRoom({
        roomId: 'my-room-123',
        roomAddress: roomPDA,
        entryFee: 1.0,
        feeTokenMint: USDC_MINT,
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
import { useSolanaContract } from './useSolanaContract';

function DistributePrizes() {
  const { distributePrizes } = useSolanaContract();

  const handleDistributePrizes = async () => {
    try {
      const result = await distributePrizes({
        roomId: 'my-room-123',
        winners: [
          'winner1...',
          'winner2...',
          'winner3...',
        ],
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
import { useSolanaContract } from './useSolanaContract';
import { createAssetRoom } from '@/features/web3/solana/api/room';

function CreateAssetRoom() {
  const { connection, wallet } = useSolanaWallet();

  const handleCreateAssetRoom = async () => {
    try {
      const result = await createAssetRoom({
        roomId: 'my-asset-room-123',
        host: wallet.publicKey,
        prizeAssets: [
          { mint: nftMint1, amount: new BN(1) },
          { mint: nftMint2, amount: new BN(1) },
          { mint: tokenMint, amount: new BN(1000) },
        ],
      });
      console.log('Asset room created:', result.room);
    } catch (error) {
      console.error('Failed to create asset room:', error);
    }
  };

  return <button onClick={handleCreateAssetRoom}>Create Asset Room</button>;
}
```

## Configuration

### Program ID

```typescript
// Devnet
export const PROGRAM_ID = new PublicKey('8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i');
```

### RPC Endpoints

```typescript
export const RPC_ENDPOINTS = {
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};
```

### Token Mints

```typescript
// Devnet
export const TOKEN_MINTS = {
  USDC: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  PYUSD: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  USDT: new PublicKey('EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS'),
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
};
```

### Fee Configuration

```typescript
export const FEES = {
  PLATFORM_BPS: 2000, // 20%
  MAX_HOST_BPS: 500,   // 5%
  MAX_COMBINED_BPS: 4000, // 40%
};
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

```typescript
import { formatTransactionError } from './transactionHelpers';

try {
  await createPoolRoom({...});
} catch (error) {
  const formatted = formatTransactionError(error);
  console.error(formatted.message);
  // User-friendly error message
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
2. Fetch room account
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

### Shared Utilities

```typescript
// Configuration
import { PROGRAM_ID, NETWORK, getTokenMints, PDA_SEEDS } from '@/shared/lib/solana/config';

// Transaction helpers
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

// PDA derivation
import { deriveRoomPDA, deriveRoomVaultPDA } from '@/shared/lib/solana/pda';

// Token accounts
import { getOrCreateATA, getAssociatedTokenAccountAddress } from '@/shared/lib/solana/token-accounts';

// Transactions
import { buildTransaction, sendWithRetry } from '@/shared/lib/solana/transactions';
```

### API Modules

```typescript
// Room operations
import { createPoolRoom, createAssetRoom, getRoomInfo } from '@/features/web3/solana/api/room';

// Player operations
import { joinRoom, getPlayerEntry } from '@/features/web3/solana/api/player';

// Prize operations
import { distributePrizes, depositPrizeAsset } from '@/features/web3/solana/api/prizes';

// Admin operations
import { initializeGlobalConfig, addApprovedToken } from '@/features/web3/solana/api/admin';
```

## Usage

### React Hook (Recommended)

```typescript
import { useSolanaContract } from '@/chains/solana/useSolanaContract';

function QuizPayment() {
  const { 
    createPoolRoom,
    joinRoom,
    distributePrizes,
    getRoomInfo,
    isConnected,
    publicKey
  } = useSolanaContract();
  
  // Implementation
}
```

### Direct API Usage

For non-React contexts or advanced use cases, you can use the API modules directly:

```typescript
import { createPoolRoom } from '@/features/web3/solana/api/room';
import { joinRoom } from '@/features/web3/solana/api/player';
import { distributePrizes } from '@/features/web3/solana/api/prizes';

// Create context
const context: SolanaContractContext = {
  program,
  provider,
  publicKey,
  connected: !!publicKey,
  isReady: !!program && !!provider && !!publicKey,
  connection,
};

// Use API modules
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

### Debug IDL Issues

```typescript
import { debugIDLCompatibility, printCompatibilityReport } from '@/shared/lib/solana/debug-idl';
import BingoIDL from '@/idl/solana_bingo.json';

// Get detailed compatibility report
const report = debugIDLCompatibility(BingoIDL);
console.log(report);

// Or print formatted report
printCompatibilityReport(BingoIDL);
```

## Reference Documentation

- [Solana Program Source Code](../../../../bingo-solana-contracts/bingo/programs/bingo/src/lib.rs)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)

## Recent Updates

### Token Account Creation (Latest)
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
