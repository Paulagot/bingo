/**
 * EVM Pool Factory Contract Configuration
 *
 * Defines PoolFactory contract addresses for each EVM-compatible network.
 * The PoolFactory is used to create pool-based fundraising rooms where winners
 * receive prizes from a pool of collected entry fees.
 *
 * ## Factory Pattern
 *
 * The PoolFactory contract follows the factory pattern:
 * - Hosts call `createPoolRoom()` to deploy a new room contract
 * - Factory returns the address of the newly deployed room
 * - Each room is an independent contract managing its own state
 *
 * ## Network Support
 *
 * - **Base Sepolia**: Testnet factory address (deployed)
 * - **Avalanche Fuji**: Testnet factory address (deployed)
 * - **Other Networks**: Placeholder addresses (TBD)
 *
 * ## Usage
 *
 * ```typescript
 * import { POOL_FACTORY, PoolFactoryABI } from './contracts.pool';
 *
 * // Get factory address for current network
 * const factoryAddress = POOL_FACTORY.baseSepolia;
 *
 * // Create a pool room
 * const tx = await writeContract({
 *   address: factoryAddress,
 *   abi: PoolFactoryABI,
 *   functionName: 'createPoolRoom',
 *   args: [...],
 * });
 * ```
 *
 * Used by `useContractActions` to deploy pool-based rooms on EVM chains.
 */
// src/chains/evm/config/contracts.pool.ts

// Use a consistent dummy placeholder for yet-to-be-deployed factories.
// Replace each with your real addresses as you deploy.
const DUMMY_ADDR = '0x1111111111111111111111111111111111111111' as const;

export const POOL_FACTORY = {
  // --- Base ---
  base:        DUMMY_ADDR, // TODO: replace with Base mainnet factory
  baseSepolia: '0x1407B51e43F5983B72577d1dB70AB107820c2e75' as const, // existing

  // --- BNB Smart Chain ---
  bsc:        DUMMY_ADDR, // TODO: replace with BSC mainnet factory
  bscTestnet: DUMMY_ADDR, // TODO: replace with BSC testnet factory

  // --- Avalanche (C-Chain) ---
  avalanche:     DUMMY_ADDR, // TODO: replace with Avalanche C-Chain mainnet factory
  avalancheFuji: '0xbD144cA5539FEBdBCf40eE24F90Ab3E608609D5d', // TODO: replace with Avalanche Fuji testnet factory

  // --- Optimism ---
  optimism:        DUMMY_ADDR, // TODO: replace with OP Mainnet factory
  optimismSepolia: DUMMY_ADDR, // TODO: replace with OP Sepolia testnet factory

  // --- Polygon ---
  polygon:     DUMMY_ADDR, // TODO: replace with Polygon mainnet factory
  polygonAmoy: DUMMY_ADDR, // TODO: replace with Polygon Amoy testnet factory
} as const;

export { default as PoolFactoryABI } from '../../../abis/quiz/BaseQuizPoolFactory2.json';
export { default as PoolRoomABI }    from '../../../abis/quiz/BaseQuizPoolRoom2.json';


