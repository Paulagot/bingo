/**
 * EVM Token Configuration
 *
 * Defines token addresses for each EVM-compatible network.
 * Supports USDC (USD Coin) and USDGLO (Glo Dollar) tokens for entry fees
 * and prize distributions.
 *
 * ## Token Details
 *
 * - **USDC**: USD Coin (Circle)
 *   - Decimals: 6
 *   - Networks: Base, Base Sepolia, Polygon, Polygon Amoy, Optimism, Avalanche, BSC
 * - **USDGLO**: Glo Dollar (charitable giving token)
 *   - Decimals: 18
 *   - Networks: Ethereum, Base, Polygon, Optimism
 *   - Same address across all supported chains
 *
 * ## Network-Specific Addresses
 *
 * Token addresses are network-specific and must match the deployed token
 * contracts on each network. Testnet tokens may differ from mainnet tokens.
 *
 * ## Usage
 *
 * ```typescript
 * import { USDC, USDGLO, USDC_DECIMALS, USDGLO_DECIMALS } from './tokens';
 *
 * // Get USDC address for current network
 * const usdcAddress = USDC.baseSepolia;
 *
 * // Get token decimals
 * const decimals = USDC_DECIMALS; // 6
 * ```
 *
 * Used by `useContractActions` and EVM wallet providers for token operations.
 */
// src/chains/evm/config/tokens.ts

// --- USDC (decimals = 6 everywhere) ---
export const USDC = {
  // Base
  base:        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const, // native USDC
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const, // Circle test USDC

  // Optimism
  optimism:        '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as const, // native USDC
  optimismSepolia: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as const, // Circle test USDC

  // Avalanche (C-Chain)
  avalanche:     '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as const, // native USDC
  avalancheFuji: '0x5425890298aed601595a70ab815c96711a31bc65' as const, // Circle test USDC

  // Polygon PoS
  polygon:     '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const, // native USDC
  polygonAmoy: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' as const, // Circle test USDC

  // BNB Smart Chain
  // NOTE: Circle does NOT issue native USDC on BSC. This is Binance-Peg USDC.
  bsc:         '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as const, // Binance-Peg USDC (BSC mainnet)
  // BSC Testnet has no official Circle USDC; this is a common test token used on testnet.
  bscTestnet:  '0x64544969ED7EBf5F083679233325356EBe738930' as const, // Binance-Peg USDC (testnet, unofficial)
} as const;

export const USDC_DECIMALS = 6 as const;

// --- USDGLO (Glo Dollar) (decimals = 18) ---
// Glo uses the SAME contract address across its supported EVM chains.
export const USDGLO = {
  ethereum: '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3' as const,
  base:     '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3' as const,
  polygon:  '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3' as const,
  optimism: '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3' as const,
  // (Also available on Celo & Arbitrum with the same address if you add those chains later.)
} as const;

export const USDGLO_DECIMALS = 18 as const;

