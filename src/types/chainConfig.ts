/**
 * ChainConfig — the only shape wallet hooks need.
 *
 * This is intentionally small. It contains exactly the four fields
 * that describe which blockchain and network a room uses.
 *
 * Rule: hooks accept ChainConfig as a parameter.
 *       They never read chain config from a store or localStorage.
 *
 * Usage:
 *   - useChainWallet(chainConfig)
 *   - useContractActions(chainConfig)
 *   - Web3Provider roomConfig prop
 *
 * To get a ChainConfig from the Zustand setup store, use toChainConfig().
 * To get a ChainConfig from a room API response, just spread the four fields.
 */
export interface ChainConfig {
  web3Chain?: string;       // 'evm' | 'solana' | 'stellar'
  evmNetwork?: string;      // 'base' | 'baseSepolia' | etc — only relevant when web3Chain === 'evm'
  solanaCluster?: string;   // 'mainnet-beta' | 'devnet' | 'testnet' — only relevant when web3Chain === 'solana'
  stellarNetwork?: string;  // 'mainnet' | 'testnet' — only relevant when web3Chain === 'stellar'
}

/**
 * Helper: extract a ChainConfig from any object that has the four fields.
 * Use this instead of spreading manually — it ensures only the four fields
 * are passed, never accidental extras.
 *
 * Example (from Zustand store):
 *   const chainConfig = toChainConfig(useQuizSetupStore().setupConfig);
 *
 * Example (from API response):
 *   const chainConfig = toChainConfig(roomData);
 */
export function toChainConfig(source: {
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  stellarNetwork?: string;
}): ChainConfig {
  return {
    web3Chain: source.web3Chain,
    evmNetwork: source.evmNetwork,
    solanaCluster: source.solanaCluster,
    stellarNetwork: source.stellarNetwork,
  };
}

/**
 * Convenience constant for mini app — always Base mainnet.
 * Use this anywhere the mini app needs a ChainConfig.
 */
export const BASE_MAINNET_CONFIG: ChainConfig = {
  web3Chain: 'evm',
  evmNetwork: 'base',
};