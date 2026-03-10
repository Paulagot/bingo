// src/hooks/useSafeAppKit.ts
//
// Safe wrappers around AppKit hooks that return empty defaults
// when AppKitProvider is not mounted (e.g. inside the Base mini app).
//
// Usage: replace useAppKitAccount() with useSafeAppKitAccount() etc.

import { useMiniAppContext } from '../context/MiniAppContext';
import { useAppKitAccount, useAppKitNetwork, useAppKit } from '@reown/appkit/react';

export function useSafeAppKitAccount() {
  const { isMiniApp } = useMiniAppContext();
  if (isMiniApp) {
    return { address: undefined, isConnected: false, status: 'disconnected' as const };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAppKitAccount();
}

export function useSafeAppKitNetwork() {
  const { isMiniApp } = useMiniAppContext();
  if (isMiniApp) {
    return { caipNetwork: undefined, chainId: undefined, caipNetworkId: undefined, switchNetwork: async () => {} };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAppKitNetwork();
}

export function useSafeAppKit() {
  const { isMiniApp } = useMiniAppContext();
  if (isMiniApp) {
    return { open: async () => {}, close: async () => {} };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAppKit();
}