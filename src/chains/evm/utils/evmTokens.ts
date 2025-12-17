// src/chains/evm/utils/evmTokens.ts
import { USDC, USDGLO, getTokenDecimals as getConfigTokenDecimals, isTokenSupported } from '../config/tokens';
import type { EvmNetworkKey } from '../config/networks';

/**
 * Get ERC20 token address for a given currency symbol and network
 * @param currency - Currency symbol (e.g., 'USDC', 'USDGLO')
 * @param targetKey - Network key
 * @returns Token address for the specified network
 * @throws Error if currency is not supported or not configured for the network
 */
export function getErc20ForCurrency(
  currency: string | undefined,
  targetKey: EvmNetworkKey
): `0x${string}` {
  const sym = (currency || 'USDC').toUpperCase();

  if (sym === 'USDC') {
    const addr = USDC[targetKey];
    if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
      return addr;
    }
    throw new Error(`USDC address not configured for network: ${targetKey}`);
  }

  if (sym === 'USDGLO' || sym === 'GLOUSD' || sym === 'GLO') {
    const addr = USDGLO[targetKey];
    if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
      return addr;
    }
    throw new Error(`Glo Dollar token address not configured for network: ${targetKey}`);
  }

  throw new Error(`Unsupported token: ${sym}. Supported tokens: USDC, USDGLO`);
}

/**
 * Get token decimals for common tokens
 * @param currency - Currency symbol
 * @returns Number of decimals (defaults to 6 for stablecoins)
 */
export function getTokenDecimals(currency?: string): number {
  return getConfigTokenDecimals(currency || 'USDC');
}

/**
 * Check if token is available on network
 */
export function isTokenAvailable(
  currency: string | undefined,
  targetKey: EvmNetworkKey
): boolean {
  const sym = (currency || 'USDC').toUpperCase();
  return isTokenSupported(sym, targetKey);
}