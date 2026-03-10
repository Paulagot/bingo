// src/context/MiniAppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// ── Extended to include Farcaster user identity fields ────────────────────────
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface MiniAppContextValue {
  isMiniApp: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  user: FarcasterUser | null;   // ← NEW: null when not in mini app
}

const MiniAppContext = createContext<MiniAppContextValue>({
  isMiniApp: false,
  walletAddress: null,
  isLoading: false,
  user: null,
});

export const MiniAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FarcasterUser | null>(null);   // ← NEW

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const context = await sdk.context;
        if (cancelled) return;

        if (context?.user?.fid) {
          setIsMiniApp(true);

          // ── Capture Farcaster user identity ──────────────────────────────
          if (!cancelled) {
            setUser({
              fid:         context.user.fid,
              username:    context.user.username    ?? undefined,
              displayName: context.user.displayName ?? undefined,
              pfpUrl:      context.user.pfpUrl      ?? undefined,
            });
          }

          // ── Capture wallet address ────────────────────────────────────────
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
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) {
          setIsMiniApp(false);
          setWalletAddress(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <MiniAppContext.Provider value={{ isMiniApp: false, walletAddress: null, isLoading: true, user: null }}>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </MiniAppContext.Provider>
    );
  }

  return (
    <MiniAppContext.Provider value={{ isMiniApp, walletAddress, isLoading, user }}>
      {children}
    </MiniAppContext.Provider>
  );
};

export const useMiniAppContext = () => useContext(MiniAppContext);