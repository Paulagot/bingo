// src/components/Web3Provider.tsx
import React, { Suspense, useEffect, useState, useRef } from 'react';

interface Web3ProviderProps {
  children: React.ReactNode;
}

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
    console.log("🌐 [Web3Provider] Mount");

    if (isInitialized && cachedProviders) {
      console.log("🌐 [Web3Provider] Using cached providers");
      setProviders(cachedProviders);
      return;
    }

    if (initializationPromise) {
      console.log("🌐 [Web3Provider] Initialization in progress, waiting...");
      initializationPromise
        .then((result) => {
          if (isMountedRef.current) {
            console.log("🌐 [Web3Provider] Initialization complete, setting providers");
            setProviders(result);
          }
        })
        .catch((err) => {
          if (isMountedRef.current) {
            console.error("🌐 [Web3Provider] Initialization failed:", err);
            setLoadingError(err instanceof Error ? err.message : "Unknown error");
          }
        });
      return;
    }

    console.log("🌐 [Web3Provider] Starting new initialization");
    
    initializationPromise = (async () => {
      try {
        console.log("🌐 [Web3Provider] Lazy-loading modules...");

        const [
          { AppKitProvider: AKProvider, createAppKit },
          wagmiModule,
          reactQueryModule,
          configModule,
        ] = await Promise.all([
          import("@reown/appkit/react"),
          import("wagmi"),
          import("@tanstack/react-query"),
          import("../config"),
        ]);

        console.log("🌐 [Web3Provider] Modules loaded successfully");

        const { WagmiProvider: WagmiProv } = wagmiModule;
        const { QueryClient, QueryClientProvider: QCProvider } = reactQueryModule;
        const { wagmiAdapter, solanaWeb3JsAdapter, projectId, networks, metadata } = configModule;

        const qc = new QueryClient({
          defaultOptions: {
            queries: { staleTime: 90_000, gcTime: 600_000 },
          },
        });

        console.log("🌐 [Web3Provider] Creating AppKit with metadata:", metadata);
        
        // ✅ MOBILE-OPTIMIZED APPKIT CONFIGURATION
    createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  projectId,
  networks,
  metadata,
  
  themeMode: "dark",
  
  features: { 
    analytics: true,
    socials: false,
    email: false,
    swaps: false,
    onramp: false,
  },
  
  // ✅ CRITICAL: Wallet connection methods
  enableWalletConnect: true,
  enableInjected: true,
  enableCoinbase: true,
  enableEIP6963: true,
  
  // ✅ Show all available wallets
  allWallets: 'SHOW',
  
  // ✅ UPDATED: Feature both Solana and EVM wallets
  featuredWalletIds: [
    // ========== SOLANA WALLETS ==========
    // These will show when user selects a Solana network
    'app.phantom', // Phantom (Solana + EVM)
    'com.solflare', // Solflare
    'app.backpack', // Backpack
    'com.exodus', // Exodus
    
    // ========== EVM WALLETS ==========
    // These will show when user selects an EVM network
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet (supports both Solana & EVM)
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Argent
  ],
  
  // ✅ Include specific wallets (ensures they appear even if not featured)
  includeWalletIds: [
    // Solana
    'app.phantom',
    'com.solflare', 
    'app.backpack',
    'com.exodus',
    
    // EVM
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Argent
  ],
  
  themeVariables: {
    '--w3m-z-index': 2147483647,
    '--w3m-accent': '#6366f1',
    '--w3m-border-radius-master': '8px',
  },
  
  defaultNetwork: networks[0],
 
});

        const result = {
          AppKitProvider: AKProvider,
          WagmiProvider: WagmiProv,
          QueryClientProvider: QCProvider,
          queryClient: qc,
          wagmiConfig: wagmiAdapter.wagmiConfig,
        };

        cachedProviders = result;
        isInitialized = true;

        console.log("✅ [Web3Provider] Initialization complete and cached");
        return result;
      } catch (err) {
        console.error("❌ [Web3Provider] Initialization error:", err);
        initializationPromise = null;
        throw err;
      }
    })();

    initializationPromise
      .then((result) => {
        if (isMountedRef.current) {
          console.log("🌐 [Web3Provider] Setting providers on mounted component");
          setProviders(result);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error("🌐 [Web3Provider] Setting error on mounted component");
          setLoadingError(err instanceof Error ? err.message : "Unknown error");
        }
      });

    return () => {
      console.log("🌐 [Web3Provider] Unmount (but initialization continues in background)");
      isMountedRef.current = false;
    };
  }, []);

  if (loadingError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-red-700 font-bold text-xl mb-2">Web3 Initialization Failed</h2>
          <p className="text-red-600 text-sm mb-4">{loadingError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
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
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          }>
            {children}
          </Suspense>
        </WagmiProvider>
      </QueryClientProvider>
    </AppKitProvider>
  );
};