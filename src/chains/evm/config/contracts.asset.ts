/**
 * EVM Asset Factory Contract Configuration
 *
 * Defines AssetFactory contract addresses for each EVM-compatible network.
 * The AssetFactory is used to create asset-based fundraising rooms where winners
 * receive pre-deposited prize assets (NFTs, tokens, etc.).
 *
 * ## Factory Pattern
 *
 * The AssetFactory contract follows the factory pattern:
 * - Hosts call `createAssetRoom()` to deploy a new room contract
 * - Factory returns the address of the newly deployed room
 * - Each room is an independent contract managing its own prize assets
 *
 * ## Network Support
 *
 * - **Base Sepolia**: Testnet factory address (deployed)
 * - **Base**: Mainnet factory address (placeholder)
 * - **Polygon**: Mainnet factory address (placeholder)
 * - **Other Networks**: Placeholder addresses (TBD)
 *
 * ## Usage
 *
 * ```typescript
 * import { ASSET_FACTORY, AssetFactoryABI } from './contracts.asset';
 *
 * // Get factory address for current network
 * const factoryAddress = ASSET_FACTORY.baseSepolia;
 *
 * // Create an asset room
 * const tx = await writeContract({
 *   address: factoryAddress,
 *   abi: AssetFactoryABI,
 *   functionName: 'createAssetRoom',
 *   args: [...],
 * });
 * ```
 *
 * Used by `useContractActions` to deploy asset-based rooms on EVM chains.
 */
// src/chains/evm/config/contracts.asset.ts

// Keep your existing placeholders; use a common dummy for new networks.
const DUMMY_ADDR = '0x1111111111111111111111111111111111111111' as const;

export const ASSET_FACTORY = {
  // --- Base ---
  baseSepolia: '0x8bb12eEBA715E0cCD383D9B277A0b60130150f17' as const, // TODO: test addr (existing)
  base:        '0x3333333333333333333333333333333333333333' as const, // TODO: mainnet (existing)

  // --- BNB Smart Chain ---
  bsc:        DUMMY_ADDR, // TODO: BSC mainnet
  bscTestnet: DUMMY_ADDR, // TODO: BSC testnet

  // --- Avalanche (C-Chain) ---
  avalanche:     DUMMY_ADDR, // TODO: Avalanche mainnet
  avalancheFuji: DUMMY_ADDR, // TODO: Avalanche Fuji

  // --- Optimism ---
  optimism:        DUMMY_ADDR, // TODO: OP Mainnet
  optimismSepolia: DUMMY_ADDR, // TODO: OP Sepolia

  // --- Polygon ---
  polygon:     '0x4444444444444444444444444444444444444444' as const, // TODO: mainnet (existing)
  polygonAmoy: DUMMY_ADDR, // TODO: Polygon Amoy
} as const;

export { default as AssetFactoryABI } from '../../../abis/quiz/BaseQuizAssetFactory.json';

