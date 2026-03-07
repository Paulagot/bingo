// src/context/MiniAppContext.tsx
//
// Provides a flag indicating we're running inside the Base mini app,
// plus the auto-resolved wallet address from sdk.context.
//
// Usage:
//   const { isMiniApp, walletAddress } = useMiniAppContext()

import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppContextValue {
  /** True when running inside the Base / Farcaster mini app */
  isMiniApp: boolean;
  /** EVM custody address from sdk.context, null if not available */
  walletAddress: string | null;
  /** True while sdk.context is still resolving */
  isLoading: boolean;
}

const MiniAppContext = createContext<MiniAppContextValue>({
  isMiniApp: false,
  walletAddress: null,
  isLoading: false,
});

export const MiniAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  let cancelled = false;

  async function resolve() {
    try {
      const context = await sdk.context;
      if (cancelled) return;

      if (context?.user?.fid) {
        setIsMiniApp(true);

        try {
          const provider = (sdk.wallet as any)?.ethProvider;
          if (provider) {
            const accounts: string[] = await provider.request({ method: 'eth_accounts' });
            if (!cancelled) setWalletAddress(accounts?.[0] ?? null);
          }
        } catch {
          if (!cancelled) setWalletAddress(null);
        }
      } else {
        if (!cancelled) {
          setIsMiniApp(false);
          setWalletAddress(null);
        }
      }
    } catch {
      if (!cancelled) {
        setIsMiniApp(false);
        setWalletAddress(null);
      }
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  }

  resolve();
  return () => { cancelled = true; };
}, []);

  return (
    <MiniAppContext.Provider value={{ isMiniApp, walletAddress, isLoading }}>
      {children}
    </MiniAppContext.Provider>
  );
};

export const useMiniAppContext = () => useContext(MiniAppContext);