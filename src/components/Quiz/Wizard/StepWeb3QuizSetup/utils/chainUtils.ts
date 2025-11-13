/**
 * Chain Utilities
 */

import type { ChoiceValue } from '../types';
import { CHOICES } from '../types';

/**
 * Derive initial dropdown value from persisted setupConfig
 */
export function deriveChoiceFromConfig(
  web3Chain?: string | null,
  evmNetwork?: string | null,
  solanaCluster?: string | null
): ChoiceValue {
  if (web3Chain === 'stellar') return 'stellar';
  if (web3Chain === 'solana') {
    return solanaCluster === 'devnet' ? 'solanaDevnet' : 'solanaMainnet';
  }
  if (web3Chain === 'evm') {
    switch (evmNetwork) {
      case 'baseSepolia': return 'baseSepolia';
      case 'bsc': return 'bsc';
      case 'bscTestnet': return 'bscTestnet';
      case 'avalanche': return 'avalanche';
      case 'avalancheFuji': return 'avalancheFuji';
      case 'optimism': return 'optimism';
      case 'optimismSepolia': return 'optimismSepolia';
      case 'base':
      default:
        return 'base';
    }
  }
  return 'stellar';
}

/**
 * Get available tokens for a given chain choice
 */
export function getTokensForChoice(choice: ChoiceValue): Array<{ value: string; label: string }> {
  if (choice === 'stellar') return [{ value: 'XLM', label: 'XLM' }];
  if (choice === 'solanaMainnet' || choice === 'solanaDevnet') {
    return [
      { value: 'USDC', label: 'USDC' },
      { value: 'PYUSD', label: 'PYUSD' },
    ];
  }
  // EVM choices
  return [
    { value: 'USDC', label: 'USDC' },
    { value: 'USDGLO', label: 'Glo Dollar' },
  ];
}

