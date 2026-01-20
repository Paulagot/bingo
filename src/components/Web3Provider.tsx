// src/components/Web3Provider.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WalletProvider } from '../context/WalletContext';
import { useQuizConfig } from './Quiz/hooks/useQuizConfig';

interface Web3ProviderProps {
  children: React.ReactNode;
  force?: boolean;
}

// 🔥 CRITICAL: Global singleton to prevent double initialization
let initializationPromise: Promise<any> | null = null;
let isInitialized = false;
let cachedProviders: any | null = null;
let appKitInstance: any = null; // Track the AppKit instance

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
  const hasInitialized = useRef(false); // 🔥 Prevent double init in same component

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

    // 🔥 CRITICAL: Prevent double initialization in same component instance
    if (hasInitialized.current) {
      console.log('⚠️ [Web3Provider] Already initialized in this component, skipping');
      return;
    }

    isMountedRef.current = true;

    // If already initialized globally, just use cached providers
    if (isInitialized && cachedProviders) {
      console.log('✅ [Web3Provider] Using cached providers');
      setProviders(cachedProviders);
      hasInitialized.current = true;
      return;
    }

    // If initialization is in progress, wait for it
    if (initializationPromise) {
      console.log('⏳ [Web3Provider] Initialization in progress, waiting...');
      initializationPromise
        .then((result) => {
          if (isMountedRef.current) {
            setProviders(result);
            hasInitialized.current = true;
          }
        })
        .catch((err) => {
          if (isMountedRef.current) setLoadingError(err?.message || 'Unknown error');
        });
      return;
    }

    console.log('🚀 [Web3Provider] Starting new initialization');
    hasInitialized.current = true;

    timeoutRef.current = setTimeout(() => {
      if (!providers && isMountedRef.current) {
        setLoadingError('Web3 initialization timed out. Please refresh the page.');
        initializationPromise = null;
      }
    }, 30000);

    initializationPromise = (async () => {
      try {
        // 🔥 Check if AppKit already exists in DOM
        const existingModal = document.querySelector('w3m-modal');
        if (existingModal && appKitInstance) {
          console.log('⚠️ [Web3Provider] AppKit already exists, reusing');
          return cachedProviders;
        }

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

        // 🔥 Only create AppKit if it doesn't exist
        if (!appKitInstance) {
          console.log('🔧 [Web3Provider] Creating AppKit instance');
          appKitInstance = createAppKit({
            adapters: [wagmiAdapter, solanaWeb3JsAdapter],
            projectId,
            networks,
            metadata,
            
            // Theme
            themeMode: 'dark',
            themeVariables: {
              '--w3m-z-index': 2147483647,
              '--w3m-accent': '#6366f1',
            },
            
            // Wallet configuration
            allWallets: 'SHOW',
            
            includeWalletIds: [
              'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
              'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
              '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Phantom
              '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Backpack
              'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // Exodus
            ],
            
            featuredWalletIds: [
              'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
              'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
              '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927',
              '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
              'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a',
            ],
            
            enableWalletConnect: true,
            enableInjected: true,
            enableEIP6963: true,
            enableCoinbase: true,
            coinbasePreference: 'smartWalletOnly',
            
            defaultNetwork: networks[0],
          });
          console.log('✅ [Web3Provider] AppKit instance created');
        } else {
          console.log('⚠️ [Web3Provider] Reusing existing AppKit instance');
        }

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
        console.error('❌ [Web3Provider] Initialization error:', err);
        initializationPromise = null;
        throw err;
      }
    })();

    initializationPromise
      .then((result) => {
        if (isMountedRef.current) {
          console.log('✅ [Web3Provider] Providers ready');
          setProviders(result);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error('❌ [Web3Provider] Failed to set providers:', err);
          setLoadingError(err?.message || 'Unknown error');
        }
      });

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Don't reset hasInitialized on cleanup - we want it to persist
    };
  }, [needsWeb3]); // 🔥 Remove 'providers' from deps to prevent re-runs

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

