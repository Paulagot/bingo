/**
 * StepWeb3QuizSetup Type Definitions
 */

export type ChoiceValue =
  | 'stellar'
  | 'base'
  | 'baseSepolia'
  | 'bsc'
  | 'bscTestnet'
  | 'avalanche'
  | 'avalancheFuji'
  | 'optimism'
  | 'optimismSepolia'
  | 'solanaMainnet'
  | 'solanaDevnet';

export type EvmNetwork =
  | 'base'
  | 'baseSepolia'
  | 'bsc'
  | 'bscTestnet'
  | 'avalanche'
  | 'avalancheFuji'
  | 'optimism'
  | 'optimismSepolia';

export type SolanaCluster = 'mainnet' | 'devnet';

export interface ChainChoice {
  value: ChoiceValue;
  label: string;
  description: string;
  kind: 'stellar' | 'evm' | 'solana';
  evmNetwork?: EvmNetwork;
  solanaCluster?: SolanaCluster;
}

export const ENABLED_CHOICES: ChoiceValue[] = ['baseSepolia', 'avalancheFuji', 'solanaDevnet'];

export const CHOICES: ChainChoice[] = [
  // ----- ENABLED -----
  { value: 'baseSepolia', label: 'Base Sepolia', description: 'EVM · Base testnet', kind: 'evm', evmNetwork: 'baseSepolia' },
  { value: 'avalancheFuji', label: 'Avalanche Fuji', description: 'EVM · Avalanche testnet', kind: 'evm', evmNetwork: 'avalancheFuji' },
  // ----- ENABLED SOLANA -----
  { value: 'solanaDevnet', label: 'Solana Devnet', description: 'Solana · Developer test network', kind: 'solana', solanaCluster: 'devnet' },
  // ----- COMMENTED OUT (uncomment when ready) -----
  // { value: 'stellar', label: 'Stellar', description: 'Fast, low-cost payments', kind: 'stellar' },
  // { value: 'base', label: 'Base', description: 'EVM · Coinbase L2 (mainnet)', kind: 'evm', evmNetwork: 'base' },
  // { value: 'bsc', label: 'BNB Smart Chain', description: 'EVM · BSC mainnet', kind: 'evm', evmNetwork: 'bsc' },
  // { value: 'bscTestnet', label: 'BNB Smart Chain Testnet', description: 'EVM · BSC testnet', kind: 'evm', evmNetwork: 'bscTestnet' },
  // { value: 'avalanche', label: 'Avalanche C-Chain', description: 'EVM · Avalanche mainnet', kind: 'evm', evmNetwork: 'avalanche' },
  // { value: 'optimism', label: 'OP Mainnet', description: 'EVM · Optimism mainnet', kind: 'evm', evmNetwork: 'optimism' },
  // { value: 'optimismSepolia', label: 'OP Sepolia', description: 'EVM · Optimism testnet', kind: 'evm', evmNetwork: 'optimismSepolia' },
  // { value: 'solanaMainnet', label: 'Solana (Mainnet)', description: 'High-speed, low-fee mainnet', kind: 'solana', solanaCluster: 'mainnet' },
];

