# Multi-Chain Wallet Integration

This directory contains chain-specific wallet implementations for the quiz platform.

## Architecture

Each chain implementation follows a consistent pattern:
- **Types**: Chain-specific TypeScript interfaces
- **Hooks**: React hooks for wallet operations  
- **Providers**: React context providers for wallet state
- **Utils**: Chain-specific utility functions
- **Config**: Network and contract configuration

## Supported Chains

### Solana
- **Directory**: `./solana/`
- **Purpose**: Solana blockchain wallet integration using Anchor framework
- **Currency**: SOL, USDC, PYUSD, USDT (SPL tokens)
- **Status**: ✅ Fully Implemented
- **Network**: Devnet, Testnet, Mainnet
- **Program ID**: `8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i` (devnet)
- **Architecture**: Modular design with domain-specific hooks
  - Main hook: `useSolanaContract.ts` (orchestrator)
  - Domain hooks: `hooks/useSolanaAdmin.ts`, `hooks/useSolanaRooms.ts`, `hooks/useSolanaPrizes.ts`, `hooks/useSolanaQueries.ts`
  - Types: `types/hook-types.ts`
  - Utilities: `utils/hook-helpers.ts`, `utils/api-wrapper.ts`
- **Features**: 
  - Pool rooms
  - Asset rooms
  - Automatic token account creation
  - Prize distribution
  - Transaction simulation
- **Documentation**: [Solana README](./solana/README.md)

### EVM (Ethereum Virtual Machine)
- **Directory**: `./evm/`
- **Purpose**: EVM-compatible chains (Ethereum, Base, Polygon, etc.)
- **Currency**: ETH, USDC (ERC-20 tokens)
- **Status**: ✅ Partially Implemented
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy
- **Features**:
  - Pool rooms
  - Asset rooms
  - Factory pattern
  - Transaction handling
- **Documentation**: [EVM README](./evm/README.md)

### Stellar
- **Directory**: `./stellar/`
- **Purpose**: Stellar blockchain wallet integration using Soros contracts
- **Currency**: XLM, USDC, Glo USD
- **Status**: ✅ Implemented
- **Network**: Testnet, Mainnet
- **Features**:
  - Pool rooms
  - Asset rooms
  - Multi-currency support
  - Stellar Smart Contracts (Soros)
- **Documentation**: [Stellar README](./stellar/README.md)

## Chain Selection

The platform supports dynamic chain selection based on user preference and room configuration. The `DynamicChainProvider` component manages chain selection and wallet connections.

### Chain Selection Logic

1. **User Preference**: User can select their preferred chain
2. **Room Configuration**: Rooms can be configured for specific chains
3. **Wallet Availability**: System checks if wallet is available for selected chain
4. **Fallback**: Falls back to available chain if preferred chain is not available

## Integration Pattern

### Common Interface

All chain implementations follow a common interface:

```typescript
interface ChainIntegration {
  // Wallet connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected: boolean;
  publicKey: string | null;
  
  // Room operations
  createRoom(params: CreateRoomParams): Promise<RoomResult>;
  joinRoom(params: JoinRoomParams): Promise<JoinRoomResult>;
  distributePrizes(params: DistributePrizesParams): Promise<DistributePrizesResult>;
  
  // Query operations
  getRoomInfo(roomId: string): Promise<RoomInfo>;
  getBalance(): Promise<string>;
}
```

### Implementation Structure

Each chain implementation includes:

1. **Wallet Provider**: React context provider for wallet state
2. **Contract Hook**: React hook for contract interactions
3. **Config**: Network and contract configuration
4. **Types**: TypeScript type definitions
5. **Utils**: Utility functions for chain-specific operations

## Naming Convention

All chain-specific components, hooks, and types follow the pattern:
- `{chain}-wallet-provider` - Wallet provider component
- `{chain}-connection` - Connection management
- `{chain}-types` - Type definitions
- `use{Chain}Contract` - Contract interaction hook
- `use{Chain}Wallet` - Wallet management hook

## Adding a New Chain

1. Create directory: `src/chains/{chainName}/`
2. Add types: `src/chains/types/{chainName}-types.ts`
3. Implement wallet hook: `src/chains/{chainName}/use{ChainName}Wallet.ts`
4. Create provider: `src/chains/{chainName}/{ChainName}WalletProvider.tsx`
5. Create contract hook: `src/chains/{chainName}/use{ChainName}Contract.ts`
6. Add config: `src/chains/{chainName}/config.ts`
7. Update `DynamicChainProvider.tsx` to include new chain
8. Update types exports in `src/chains/types/index.ts`
9. Add README: `src/chains/{chainName}/README.md`

## Chain-Specific Features

### Solana
- **PDA-based Accounts**: Program Derived Addresses for security
- **Transaction Simulation**: Pre-flight simulation before execution
- **Token Account Management**: Automatic creation of missing accounts
- **Anchor Framework**: Type-safe program interactions

### EVM
- **Factory Pattern**: Factory contracts for room creation
- **Gas Estimation**: Gas estimation before transaction submission
- **Event Listening**: Event listeners for transaction updates
- **Multi-Network**: Support for multiple EVM-compatible networks

### Stellar
- **Soros Contracts**: Stellar Smart Contracts for room management
- **Multi-Currency**: Support for multiple Stellar assets
- **Trustlines**: Automatic trustline management
- **Horizon API**: Stellar Horizon API integration

## Economic Model

All chains follow the same economic model:

### Fee Allocation (Entry Fees)
```
Platform Fee:  20% (fixed)
Host Allocation: 40% total (configurable within this limit)
  - Host Fee:   0-5% (host chooses)
  - Prize Pool: 0-35% (calculated as 40% - host fee)
Charity:       Minimum 40% (calculated remainder)
```

### Extras Allocation
```
All extras (beyond entry fee) go 100% to charity
This maximizes fundraising impact and is transparent to all participants
```

## Transaction Flow

### Room Creation
1. Validate inputs (entry fee, host fee, prize pool)
2. Connect wallet
3. Build transaction
4. Simulate transaction (if supported)
5. Sign and submit transaction
6. Wait for confirmation
7. Return room address

### Joining Room
1. Validate inputs (room ID, entry fee)
2. Connect wallet
3. Approve token transfer (if required)
4. Build transaction
5. Sign and submit transaction
6. Wait for confirmation
7. Return transaction hash

### Prize Distribution
1. Validate inputs (room ID, winners)
2. Connect wallet
3. Check/create token accounts (if required)
4. Build transaction
5. Sign and submit transaction
6. Wait for confirmation
7. Return transaction hash

## Error Handling

### Common Errors
- **InsufficientFunds**: User doesn't have enough tokens
- **RoomFull**: Room has reached max players
- **RoomEnded**: Room has already ended
- **InvalidWinner**: Winner is not a player in the room
- **TransactionFailed**: Transaction was rejected or failed

### Error Formatting
Each chain implementation provides error formatting for user-friendly error messages:

```typescript
try {
  await createRoom({...});
} catch (error) {
  const formattedError = formatError(error);
  console.error(formattedError.message);
}
```

## Configuration

### Environment Variables
- `VITE_SOLANA_RPC_DEVNET`: Solana RPC endpoint for devnet
- `VITE_SOLANA_RPC_URL`: Solana RPC endpoint for mainnet
- `VITE_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID (for Stellar)

### Network Configuration
Each chain has its own network configuration:
- **Solana**: Devnet, Testnet, Mainnet
- **EVM**: Base, Base Sepolia, Polygon, Polygon Amoy
- **Stellar**: Testnet, Mainnet

## Testing

### Testnet Setup
1. **Solana**: Get testnet SOL from [Solana Faucet](https://faucet.solana.com/)
2. **EVM**: Get testnet ETH from network-specific faucets
3. **Stellar**: Get testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)

### Test Tokens
- **Solana**: Mint testnet USDC from [Circle Faucet](https://faucet.circle.com/)
- **EVM**: Get testnet USDC from network-specific faucets
- **Stellar**: Get testnet USDC from Stellar testnet

## Reference Documentation

- [Solana Documentation](./solana/README.md)
- [EVM Documentation](./evm/README.md)
- [Stellar Documentation](./stellar/README.md)
- [Main README](../../README.md)

## Contributing

When adding support for a new chain:

1. Follow the existing pattern for chain implementations
2. Implement the common interface
3. Add comprehensive error handling
4. Include transaction simulation (if supported)
5. Add unit tests
6. Update this README
7. Add chain-specific README

## Future Enhancements

- **Cross-Chain Support**: Bridge between different chains
- **Multi-Chain Rooms**: Rooms that support multiple chains
- **Chain Aggregation**: Aggregate balances and transactions across chains
- **Universal Wallet**: Single wallet interface for all chains
