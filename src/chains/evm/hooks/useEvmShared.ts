import { useCallback } from 'react';
import { getChainId } from 'wagmi/actions';
import { useConfig } from 'wagmi';
import { resolveEvmTarget, type ResolvedEvmTarget } from '../utils/evmSelect';

export interface EvmSetupConfig {
  evmNetwork?: string;
  web3CharityOrgId?: string;
  currencySymbol?: string;
  web3Currency?: string;
  [key: string]: any;
}

export function useEvmShared() {
  const wagmiConfig = useConfig();

  // getSetupConfig stays in the file — other callers (useEvmDeploy etc.) may use it.
  // It is no longer called inside resolveTarget.
  const getSetupConfig = useCallback((): EvmSetupConfig => {
    try {
      const stored = localStorage.getItem('setupConfig');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('[useEvmShared] Failed to parse setupConfig:', e);
      return {};
    }
  }, []);

  // Step 2 change: setupKey is always null.
  // resolveEvmTarget falls back to the live wagmi chainId, then to 'baseSepolia'.
  // We never read localStorage here — stale host config was causing join flow
  // to target the wrong network (e.g. 'base' when the room was on 'baseSepolia').
  const resolveTarget = useCallback(async (): Promise<ResolvedEvmTarget> => {
    let runtimeChainId: number | null = null;
    try {
      runtimeChainId = await getChainId(wagmiConfig);
    } catch {
      runtimeChainId = null;
    }

    return resolveEvmTarget({
      setupKey: null,          // Never read from localStorage — trust live wagmi state
      runtimeChainId,
    });
  }, [wagmiConfig]);            // getSetupConfig removed from deps — no longer called here

  return {
    wagmiConfig,
    getSetupConfig,
    resolveTarget,
  };
}