// src/components/Web3Provider.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WalletProvider } from '../context/WalletContext';
import { useQuizConfig } from './Quiz/hooks/useQuizConfig';

interface Web3ProviderProps {
  children: React.ReactNode;
  force?: boolean;
}

let initializationPromise: Promise<any> | null = null;
let isInitialized = false;
let cachedProviders: any | null = null;
let appKitInstance: any = null;

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

    if (isInitialized && cachedProviders) {
      console.log('✅ [Web3Provider] Using cached providers');
      setProviders(cachedProviders);
      return;
    }

    if (initializationPromise) {
      console.log('⏳ [Web3Provider] Initialization in progress, waiting...');
      initializationPromise
        .then((result) => {
          console.log('✅ [Web3Provider] Providers ready from existing init');
          setProviders(result);
        })
        .catch((err) => {
          console.error('❌ [Web3Provider] Init failed:', err);
          setLoadingError(err?.message || 'Unknown error');
        });
      return;
    }

    console.log('🚀 [Web3Provider] Starting new initialization');

    timeoutRef.current = setTimeout(() => {
      if (!providers) {
        console.error('❌ [Web3Provider] Initialization timed out');
        setLoadingError('Web3 initialization timed out. Please refresh the page.');
        initializationPromise = null;
        isInitialized = false;
      }
    }, 30000);

    initializationPromise = (async () => {
      try {
        console.log('📦 [Web3Provider] Loading modules...');
        
        const [
          appKitModule,
          wagmiModule,
          queryModule,
          _solanaModule, // 🔥 Prefixed with underscore - needed for import but not directly used
          configModule,
        ] = await Promise.all([
          import('@reown/appkit/react'),
          import('wagmi'),
          import('@tanstack/react-query'),
          import('@reown/appkit-adapter-solana/react'), // Still imported for side effects
          import('../config'),
        ]);

        console.log('✅ [Web3Provider] Modules loaded');

        const { createAppKit, AppKitProvider } = appKitModule;
        const { WagmiProvider } = wagmiModule;
        const { QueryClient, QueryClientProvider } = queryModule;
        const { wagmiAdapter, solanaWeb3JsAdapter, projectId, networks, metadata } = configModule;

        if (!projectId) {
          throw new Error('Missing VITE_PROJECT_ID environment variable');
        }

        const queryClient = new QueryClient({
          defaultOptions: { queries: { staleTime: 90_000, gcTime: 600_000 } },
        });

    if (!appKitInstance) {
  console.log('🔧 [Web3Provider] Creating AppKit instance');
  
  appKitInstance = createAppKit({
    adapters: [wagmiAdapter, solanaWeb3JsAdapter],
    projectId,
    networks,
    metadata,
    
    themeMode: 'dark',
    themeVariables: {
      '--w3m-z-index': 2147483647,
      '--w3m-accent': '#6366f1',
    },
    
    // 🔥 Wallet configuration - show ALL wallets with featured ones at top
    allWallets: 'SHOW',
    
    // Only feature specific wallets, don't restrict to only these
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
      '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Phantom
      '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Backpack
      'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // Exodus
    ],
    
    // 🔥 REMOVED includeWalletIds - this was restricting the list!
    
    // Disable social/email login
    features: {
      socials: false,
      email: false,
      emailShowWallets: false,
    },
    
    enableWalletConnect: true,
    enableInjected: true,
    enableEIP6963: true,
    enableCoinbase: true,
    coinbasePreference: 'smartWalletOnly',
    
    defaultNetwork: networks[0],
  });
  
  console.log('✅ [Web3Provider] AppKit instance created');
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

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        console.log('✅ [Web3Provider] Initialization complete');
        return result;
        
      } catch (err: any) {
        console.error('❌ [Web3Provider] Initialization error:', err);
        initializationPromise = null;
        isInitialized = false;
        throw err;
      }
    })();

    initializationPromise
      .then((result) => {
        console.log('✅ [Web3Provider] Setting providers');
        setProviders(result);
      })
      .catch((err) => {
        console.error('❌ [Web3Provider] Failed:', err);
        setLoadingError(err?.message || 'Unknown error');
      });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [needsWeb3]);

  console.log('🔄 [Web3Provider] Render - providers:', !!providers, 'needsWeb3:', needsWeb3);

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

  console.log('✅ [Web3Provider] Rendering with providers');
  
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

