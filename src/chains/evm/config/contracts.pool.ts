// src/chains/evm/config/contracts.pool.ts
export const POOL_FACTORY = {
  baseSepolia: '0xfd8559750589EedDE6bfC85f84DCF6aA14245Cc9' as const,
  base:        '/* TODO: your mainnet address */' as const,

  polygon:     '0x1111111111111111111111111111111111111111' as const,
};

export { default as PoolFactoryABI } from '../../../abis/quiz/BaseQuizPoolFactory.json';
export { default as PoolRoomABI }    from '../../../abis/quiz/BaseQuizPoolRoom.json';

