// src/chains/evm/config/contracts.asset.ts

// Keep your existing placeholders; use a common dummy for new networks.
const DUMMY_ADDR = '0x1111111111111111111111111111111111111111' as const;

export const ASSET_FACTORY = {
  // --- Base ---
  baseSepolia: '0x7775A6c38347FE7284be1298FCdDB291F1A24CCe' as const, // TODO: test addr (existing)
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

