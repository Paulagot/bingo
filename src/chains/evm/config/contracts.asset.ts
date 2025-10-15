export const ASSET_FACTORY = {
  baseSepolia: '0x2222222222222222222222222222222222222222' as const, // TODO test addr
  base:        '0x3333333333333333333333333333333333333333' as const, // TODO mainnet
  polygon:     '0x4444444444444444444444444444444444444444' as const, // TODO mainnet
  // polygonAmoy: '0x...' as const,
};

export { default as AssetFactoryABI } from '../../../abis/quiz/BaseQuizAssetFactory.json';
