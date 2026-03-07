// src/context/MiniAppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppContextValue {
  isMiniApp: boolean;
  walletAddress: string | null;
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

  // Block rendering until we know which path we're on.
  // This prevents Web3Provider/AppKit from initialising before
  // we know if we're in the mini app or not.
  if (isLoading) {
    return (
      <MiniAppContext.Provider value={{ isMiniApp: false, walletAddress: null, isLoading: true }}>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </MiniAppContext.Provider>
    );
  }

  return (
    <MiniAppContext.Provider value={{ isMiniApp, walletAddress, isLoading }}>
      {children}
    </MiniAppContext.Provider>
  );
};

export const useMiniAppContext = () => useContext(MiniAppContext);