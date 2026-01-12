import React, { Suspense, useEffect, useState, useRef } from 'react';

interface Web3ProviderProps {
  children: React.ReactNode;
}

// Singleton pattern to avoid multiple initializations
let initializationPromise: Promise<any> | null = null;
let isInitialized = false;
let cachedProviders: any | null = null;

const Web3LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 font-semibold">Initializing Web3…</p>
    </div>
  </div>
);

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [providers, setProviders] = useState(cachedProviders);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitialized && cachedProviders) {
      setProviders(cachedProviders);
      return;
    }

    if (initializationPromise) {
      initializationPromise.then((result) => {
        if (isMountedRef.current) setProviders(result);
      }).catch((err) => {
        if (isMountedRef.current) setLoadingError(err.message || "Unknown error");
      });
      return;
    }

    initializationPromise = (async () => {
      try {
        const [
          { createAppKit, AppKitProvider },
          { WagmiProvider },
          { QueryClient, QueryClientProvider },
          configModule,
        ] = await Promise.all([
          import("@reown/appkit/react"),
          import("wagmi"),
          import("@tanstack/react-query"),
          import("../config"),
        ]);

        const { wagmiAdapter, solanaWeb3JsAdapter, projectId, networks, metadata } = configModule;

        const queryClient = new QueryClient({
          defaultOptions: { queries: { staleTime: 90_000, gcTime: 600_000 } },
        });

        createAppKit({
          adapters: [wagmiAdapter, solanaWeb3JsAdapter],
          projectId,
          networks,
          metadata,

          themeMode: "dark",
          themeVariables: {
            '--w3m-z-index': 2147483647,
            '--w3m-accent': '#6366f1',
          },

          // Mobile optimizations – critical for better return flow
          enableMobileFullScreen: true,         // Fullscreen modal on mobile
          allWallets: 'SHOW',                   // Show mobile wallets
          enableWalletConnect: true,
          enableInjected: true,
          enableCoinbase: true,
          enableEIP6963: true,

          // Helps avoid Coinbase smart wallet redirect loops
          coinbasePreference: 'eoaOnly',

          // Prioritize popular mobile wallets (WalletConnect IDs)
          featuredWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
            '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Ledger
            // Phantom auto-detected via Solana adapter + Wallet Standard
          ],

          defaultNetwork: networks[0],
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
        return result;
      } catch (err: any) {
        initializationPromise = null;
        throw err;
      }
    })()
      .then((result) => { if (isMountedRef.current) setProviders(result); })
      .catch((err) => { if (isMountedRef.current) setLoadingError(err.message); });

    return () => { isMountedRef.current = false; };
  }, []);

  if (loadingError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-red-700 font-bold text-xl mb-2">Web3 Init Failed</h2>
          <p className="text-red-600 mb-4">{loadingError}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!providers) return <Web3LoadingFallback />;

  const { AppKitProvider, WagmiProvider, QueryClientProvider, queryClient, wagmiConfig } = providers;

  return (
    <AppKitProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            {children}
          </Suspense>
        </WagmiProvider>
      </QueryClientProvider>
    </AppKitProvider>
  );
};