// src/components/Web3Provider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ChainConfig } from '../types/chainConfig';

// ─── Context ─────────────────────────────────────────────────────────────────
interface Web3ChainContextValue {
  chainConfig: ChainConfig;
}

const Web3ChainContext = createContext<Web3ChainContextValue>({
  chainConfig: {},
});

// ← arrow function fixes Vite Fast Refresh incompatibility
export const useWeb3ChainConfig = (): ChainConfig =>
  useContext(Web3ChainContext).chainConfig;

// ─── Mounted guard ────────────────────────────────────────────────────────────
const Web3ProviderMountedContext = createContext(false);

// ─── Provider props ───────────────────────────────────────────────────────────
interface Web3ProviderProps {
  children: React.ReactNode;
  force?: boolean;
  roomConfig?: ChainConfig;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
let initializationPromise: Promise<any> | null = null;
let isInitialized = false;
let cachedProviders: any | null = null;

// ─── Loading fallback ─────────────────────────────────────────────────────────
const Web3LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 font-semibold">Initializing Web3…</p>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const Web3Provider: React.FC<Web3ProviderProps> = ({
  children,
  force = false,
  roomConfig = {},
}) => {
  const alreadyMounted = useContext(Web3ProviderMountedContext);
  const [providers, setProviders] = useState(cachedProviders);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const needsWeb3 = useMemo(() => {
    if (force) return true;
    if (roomConfig?.web3Chain) return true;
    const contractAddr = localStorage.getItem('current-contract-address');
    if (contractAddr) return true;
    return false;
  }, [force, roomConfig?.web3Chain]);

  useEffect(() => {
    if (alreadyMounted) return;
    if (!needsWeb3) return;

    if (isInitialized && cachedProviders) {
      setProviders(cachedProviders);
      return;
    }

    if (initializationPromise) {
      initializationPromise
        .then(setProviders)
        .catch((err) => setLoadingError(err?.message || 'Unknown error'));
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (!providers) {
        setLoadingError('Web3 initialization timed out. Please refresh the page.');
        initializationPromise = null;
        isInitialized = false;
      }
    }, 30000);

    initializationPromise = (async () => {
      try {
        const [wagmiModule, queryModule, appKitModule, configModule] = await Promise.all([
          import('wagmi'),
          import('@tanstack/react-query'),
          import('@reown/appkit/react'),
          import('../config'),
        ]);

        const { WagmiProvider } = wagmiModule;
        const { QueryClient, QueryClientProvider } = queryModule;
        const { AppKitProvider } = appKitModule;
        const { wagmiAdapter } = configModule;

        const queryClient = new QueryClient({
          defaultOptions: { queries: { staleTime: 90_000, gcTime: 600_000 } },
        });

        const result = {
          AppKitProvider,
          WagmiProvider,
          QueryClientProvider,
          queryClient,
          wagmiConfig: wagmiAdapter.wagmiConfig,
        };

        cachedProviders = result;
        isInitialized = true;
        clearTimeout(timeoutRef.current);
        return result;

      } catch (err: any) {
        initializationPromise = null;
        isInitialized = false;
        throw err;
      }
    })();

    initializationPromise
      .then(setProviders)
      .catch((err) => setLoadingError(err?.message || 'Unknown error'));

    return () => clearTimeout(timeoutRef.current);
  }, [needsWeb3, alreadyMounted]);

  // ── Already mounted above — just update chainConfig context, skip providers ──
  if (alreadyMounted) {
    return (
      <Web3ChainContext.Provider value={{ chainConfig: roomConfig }}>
        {children}
      </Web3ChainContext.Provider>
    );
  }

  // ── Not a web3 page ───────────────────────────────────────────────────────
  if (!needsWeb3) {
    return (
      <Web3ChainContext.Provider value={{ chainConfig: roomConfig }}>
        <Web3ProviderMountedContext.Provider value={true}>
          {children}
        </Web3ProviderMountedContext.Provider>
      </Web3ChainContext.Provider>
    );
  }

  if (loadingError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-red-700">Web3 Init Failed</h2>
          <p className="mb-4 text-red-600">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!providers) return <Web3LoadingFallback />;

  const { AppKitProvider, WagmiProvider, QueryClientProvider, queryClient, wagmiConfig } = providers;

  return (
    <Web3ChainContext.Provider value={{ chainConfig: roomConfig }}>
      <Web3ProviderMountedContext.Provider value={true}>
        <AppKitProvider>
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
              {children}
            </WagmiProvider>
          </QueryClientProvider>
        </AppKitProvider>
      </Web3ProviderMountedContext.Provider>
    </Web3ChainContext.Provider>
  );
};

