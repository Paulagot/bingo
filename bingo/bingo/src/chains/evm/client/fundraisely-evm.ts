import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import FactoryABI from '@/abis/pool/Factory.json';
import RoomABI from '@/abis/pool/Room.json';

const CHAINS = { base, baseSepolia } as const;
export type EvmNet = keyof typeof CHAINS; // 'base' | 'baseSepolia'

export const clients = (net: EvmNet) => ({
  public: createPublicClient({ chain: CHAINS[net], transport: http() }),
  wallet: createWalletClient({ chain: CHAINS[net], transport: custom((window as any).ethereum) }),
});

export const USDC = {
  base: '/* TODO: Base USDC */',
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;
export const USDC_DECIMALS = 6;

export const POOL_FACTORY = {
  base:        '/* TODO */',
  baseSepolia: '0xfd8559750589EedDE6bfC85f84DCF6aA14245Cc9',
} as const;

// e.g. approve USDC, join room, settle ... to be completed once ABIs are dropped
export const toUSDC = (v: string) => parseUnits(v, USDC_DECIMALS);
