# EVM Wallet Integration

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

- `wagmi` - React hooks for Ethereum
- `@reown/appkit` - Wallet connection UI
- `viem` - TypeScript Ethereum library

## Integration Notes

The quiz platform already has an existing `Web3Provider.tsx` that handles EVM connections for non-quiz pages. This module will:

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

1. Extract reusable logic from existing `Web3Provider`
2. Create `useEvmWallet` hook for quiz functionality
3. Update `DynamicChainProvider` to use existing EVM setup
4. Maintain existing functionality for non-quiz pages
