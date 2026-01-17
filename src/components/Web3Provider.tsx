// src/components/Web3Provider.tsx
import React, { useEffect, useState, useRef } from 'react';

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
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    isMountedRef.current = true;

    // ✅ If already initialized, use cached providers
    if (isInitialized && cachedProviders) {
      console.log('[Web3Provider] ✅ Using cached providers');
      setProviders(cachedProviders);
      return;
    }

    // ✅ If initialization in progress, wait for it
    if (initializationPromise) {
      console.log('[Web3Provider] ⏳ Waiting for existing initialization');
      initializationPromise
        .then((result) => {
          if (isMountedRef.current) {
            console.log('[Web3Provider] ✅ Received providers from existing init');
            setProviders(result);
          }
        })
        .catch((err) => {
          if (isMountedRef.current) setLoadingError(err.message || "Unknown error");
        });
      return;
    }

    // ✅ Start new initialization
    console.log('[Web3Provider] 🚀 Starting new initialization');
    
    // ✅ Set timeout to catch hung initializations
    timeoutRef.current = setTimeout(() => {
      if (!providers && isMountedRef.current) {
        console.error('[Web3Provider] ⏰ Initialization timeout after 30s');
        setLoadingError('Web3 initialization timed out. Please refresh the page.');
        initializationPromise = null;
      }
    }, 30000);

    initializationPromise = (async () => {
      try {
        console.log('[Web3Provider] 📦 Loading dependencies...');
        
        const [
          { createAppKit, AppKitProvider },
          { WagmiProvider },
          { QueryClient, QueryClientProvider },
          solanaModule, // ✅ Import Solana connection utilities
          configModule,
        ] = await Promise.all([
          import("@reown/appkit/react"),
          import("wagmi"),
          import("@tanstack/react-query"),
          import("@reown/appkit-adapter-solana/react"), // ✅ ADD THIS
          import("../config"),
        ]);

        console.log('[Web3Provider] ✅ Dependencies loaded');
        console.log('[Web3Provider] 🔍 Solana module loaded:', Object.keys(solanaModule));

        const { wagmiAdapter, solanaWeb3JsAdapter, projectId, networks, metadata } = configModule;

        // ✅ Check for missing project ID
        if (!projectId) {
          throw new Error('Missing VITE_PROJECT_ID environment variable');
        }

        console.log('[Web3Provider] 🔧 Creating AppKit with projectId:', projectId);

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

          enableMobileFullScreen: true,
          allWallets: 'SHOW',
          enableWalletConnect: true,
          enableInjected: true,
          enableCoinbase: true,
          enableEIP6963: true,

          coinbasePreference: 'eoaOnly',

          featuredWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
            '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Ledger
          ],

          defaultNetwork: networks[0],
        });

        console.log('[Web3Provider] ✅ AppKit created successfully');

        const result = {
          AppKitProvider,
          WagmiProvider,
          QueryClientProvider,
          queryClient,
          wagmiConfig: wagmiAdapter.wagmiConfig,
        };

        cachedProviders = result;
        isInitialized = true;
        
        // ✅ Clear timeout on success
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        return result;
      } catch (err: any) {
        console.error('[Web3Provider] ❌ Initialization failed:', err);
        initializationPromise = null;
        throw err;
      }
    })();

    initializationPromise
      .then((result) => { 
        if (isMountedRef.current) {
          console.log('[Web3Provider] 🎉 Initialization complete, setting providers');
          setProviders(result);
        }
      })
      .catch((err) => { 
        if (isMountedRef.current) {
          console.error('[Web3Provider] ❌ Error setting providers:', err);
          setLoadingError(err.message);
        }
      });

    return () => { 
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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

  if (!providers) {
    console.log('[Web3Provider] ⏳ Rendering loading fallback');
    return <Web3LoadingFallback />;
  }

  console.log('[Web3Provider] ✅ Rendering children with providers');

  const { AppKitProvider, WagmiProvider, QueryClientProvider, queryClient, wagmiConfig } = providers;

  return (
    <AppKitProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </AppKitProvider>
  );
};