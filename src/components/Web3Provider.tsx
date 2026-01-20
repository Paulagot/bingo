// src/components/Web3Provider.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WalletProvider } from '../context/WalletContext';
import { useQuizConfig } from './Quiz/hooks/useQuizConfig';

interface Web3ProviderProps {
  children: React.ReactNode;
  force?: boolean;
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

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children, force = false }) => {
  const [providers, setProviders] = useState(cachedProviders);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { config } = useQuizConfig();

  const needsWeb3 = useMemo(() => {
    if (force) return true;

    const paymentMethod = (config as any)?.paymentMethod;
    const isWeb3RoomFlag = (config as any)?.isWeb3Room;

    if (paymentMethod === 'web3') return true;
    if (isWeb3RoomFlag === true) return true;
    if (config?.web3Chain) return true;

    const contractAddr = localStorage.getItem('current-contract-address');
    if (contractAddr) return true;

    return false;
  }, [force, config?.web3Chain, (config as any)?.paymentMethod, (config as any)?.isWeb3Room]);

  const roomConfig = useMemo(
    () => ({
      web3Chain: config?.web3Chain,
      evmNetwork: config?.evmNetwork,
      solanaCluster: (config as any)?.solanaCluster || (config as any)?.solanaNetwork,
      stellarNetwork: config?.stellarNetwork,
    }),
    [
      config?.web3Chain,
      config?.evmNetwork,
      (config as any)?.solanaCluster,
      (config as any)?.solanaNetwork,
      config?.stellarNetwork,
    ]
  );

  useEffect(() => {
    if (!needsWeb3) return;

    isMountedRef.current = true;

    if (isInitialized && cachedProviders) {
      setProviders(cachedProviders);
      return;
    }

    if (initializationPromise) {
      initializationPromise
        .then((result) => {
          if (isMountedRef.current) setProviders(result);
        })
        .catch((err) => {
          if (isMountedRef.current) setLoadingError(err?.message || 'Unknown error');
        });
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (!providers && isMountedRef.current) {
        setLoadingError('Web3 initialization timed out. Please refresh the page.');
        initializationPromise = null;
      }
    }, 30000);

    initializationPromise = (async () => {
      try {
        const [
          { createAppKit, AppKitProvider },
          { WagmiProvider },
          { QueryClient, QueryClientProvider },
          _solanaModule,
          configModule,
        ] = await Promise.all([
          import('@reown/appkit/react'),
          import('wagmi'),
          import('@tanstack/react-query'),
          import('@reown/appkit-adapter-solana/react'),
          import('../config'),
        ]);

        const { wagmiAdapter, solanaWeb3JsAdapter, projectId, networks, metadata } = configModule;

        if (!projectId) throw new Error('Missing VITE_PROJECT_ID environment variable');

        const queryClient = new QueryClient({
          defaultOptions: { queries: { staleTime: 90_000, gcTime: 600_000 } },
        });

        createAppKit({
          adapters: [wagmiAdapter, solanaWeb3JsAdapter],
          projectId,
          networks,
          metadata,
          themeMode: 'dark',
          themeVariables: {
            '--w3m-z-index': 2147483647,
            '--w3m-accent': '#6366f1',
          },
          
          // 🔥 ENHANCED MOBILE CONFIGURATION
          enableMobileFullScreen: true,
          allWallets: 'SHOW',
          
          // WalletConnect options
          enableWalletConnect: true,
          
          // Browser wallet detection
          enableInjected: true,
          enableEIP6963: true,
          
          // Coinbase configuration
          enableCoinbase: true,
          coinbasePreference: 'all', // Supports both mobile app and extension
          
          // Mobile-specific features
          enableWalletGuide: true, // Shows install prompts for mobile
          
          // Featured wallets (prioritized in the modal)
          featuredWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
            '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Phantom
            '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Backpack
            'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // Exodus
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

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        return result;
      } catch (err: any) {
        initializationPromise = null;
        throw err;
      }
    })();

    initializationPromise
      .then((result) => {
        if (isMountedRef.current) setProviders(result);
      })
      .catch((err) => {
        if (isMountedRef.current) setLoadingError(err?.message || 'Unknown error');
      });

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [needsWeb3, providers]);

  if (!needsWeb3) {
    return <>{children}</>;
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

  if (!providers) {
    return <Web3LoadingFallback />;
  }

  const { AppKitProvider, WagmiProvider, QueryClientProvider, queryClient, wagmiConfig } = providers;

  return (
    <AppKitProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <WalletProvider roomConfig={roomConfig}>{children}</WalletProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </AppKitProvider>
  );
};

