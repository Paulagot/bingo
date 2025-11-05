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


