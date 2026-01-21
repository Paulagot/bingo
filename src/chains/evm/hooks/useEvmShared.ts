import { useCallback } from 'react';
import { getChainId } from 'wagmi/actions';
import { wagmiConfig } from '../../../../src/config/index';
import { resolveEvmTarget, type ResolvedEvmTarget } from '../utils/evmSelect';


export interface EvmSetupConfig {
  evmNetwork?: string;
  web3CharityOrgId?: string;
  currencySymbol?: string;
  web3Currency?: string;
  [key: string]: any;
}

/**
 * Shared EVM utilities and state access
 */
export function useEvmShared() {
  /**
   * Get current setup configuration from localStorage
   */
  const getSetupConfig = useCallback((): EvmSetupConfig => {
    try {
      const stored = localStorage.getItem('setupConfig');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('[useEvmShared] Failed to parse setupConfig:', e);
      return {};
    }
  }, []);

  /**
   * Resolve the target EVM network based on setup and wallet state
   */
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
  }, [getSetupConfig]);

  return {
    wagmiConfig,
    getSetupConfig,
    resolveTarget,
  };
}