# Multi-Chain Wallet Integration

This directory contains chain-specific wallet implementations for the quiz platform.

## Architecture

Each chain implementation follows a consistent pattern:
- **Types**: Chain-specific TypeScript interfaces
- **Hooks**: React hooks for wallet operations  
- **Providers**: React context providers for wallet state
- **Utils**: Chain-specific utility functions

## Supported Chains

### Stellar
- **Directory**: `./stellar/`
- **Purpose**: Stellar blockchain wallet integration using Stellar Wallet Kit
- **Currency**: XLM, USDC, Glo USD
- **Status**: 🚧 In Development

### EVM (Ethereum Virtual Machine)
- **Directory**: `./evm/`
- **Purpose**: EVM-compatible chains (Ethereum, Polygon, etc.)
- **Currency**: ETH, USDC, ERC-20 tokens
- **Status**: ⏳ Planned (existing Web3Provider to be integrated)

### Solana
- **Directory**: `./solana/`
- **Purpose**: Solana blockchain wallet integration
- **Currency**: SOL, USDC, SPL tokens
- **Status**: ⏳ Planned

## Naming Convention

All chain-specific components, hooks, and types follow the pattern:
- `{chain}-wallet-provider`
- `{chain}-connection`
- `{chain}-types`

## Adding a New Chain

1. Create directory: `src/chains/{chainName}/`
2. Add types: `src/chains/types/{chainName}-types.ts`
3. Implement wallet hook: `src/chains/{chainName}/use{ChainName}Wallet.ts`
4. Create provider: `src/chains/{chainName}/{ChainName}WalletProvider.tsx`
5. Update `DynamicChainProvider.tsx` to include new chain
6. Update types exports in `src/chains/types/index.ts`
