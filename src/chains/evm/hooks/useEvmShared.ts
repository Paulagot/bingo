import { useCallback } from 'react';
import { getChainId } from 'wagmi/actions';
import { useConfig } from 'wagmi';                          // ← ADD
import { resolveEvmTarget, type ResolvedEvmTarget } from '../utils/evmSelect';
// ← REMOVE the wagmiConfig import from config/index entirely

export interface EvmSetupConfig {
  evmNetwork?: string;
  web3CharityOrgId?: string;
  currencySymbol?: string;
  web3Currency?: string;
  [key: string]: any;
}

export function useEvmShared() {
  const wagmiConfig = useConfig();                          // ← ADD: reads from nearest WagmiProvider

  const getSetupConfig = useCallback((): EvmSetupConfig => {
    try {
      const stored = localStorage.getItem('setupConfig');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('[useEvmShared] Failed to parse setupConfig:', e);
      return {};
    }
  }, []);

  const resolveTarget = useCallback(async (): Promise<ResolvedEvmTarget> => {
    let runtimeChainId: number | null = null;
    try {
      runtimeChainId = await getChainId(wagmiConfig);
    } catch {
      runtimeChainId = null;
    }

    const setup = getSetupConfig();
    const setupKey = setup?.evmNetwork as string | undefined;

    return resolveEvmTarget({
      setupKey: setupKey ?? null,
      runtimeChainId: runtimeChainId ?? null,
    });
  }, [wagmiConfig, getSetupConfig]);

  return {
    wagmiConfig,
    getSetupConfig,
    resolveTarget,
  };
}