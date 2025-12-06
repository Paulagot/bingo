// src/components/Web3Provider.tsx
import React, { Suspense, useEffect, useState, useRef } from 'react';

interface Web3ProviderProps {
  children: React.ReactNode;
}

// ✅ Module-level singleton to survive remounts
let initializationPromise: Promise<any> | null = null;
let isInitialized = false;
let cachedProviders: {
  AppKitProvider: any;
  WagmiProvider: any;
  QueryClientProvider: any;
  queryClient: any;
  wagmiConfig: any;
} | null = null;

// Loading fallback component
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

    // ✅ If already initialized, use cached providers
    if (isInitialized && cachedProviders) {
      console.log("🌐 [Web3Provider] Using cached providers");
      setProviders(cachedProviders);
      return;
    }

    // ✅ If initialization already in progress, wait for it
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

    // ✅ Start new initialization
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

        console.log("🌐 [Web3Provider] Creating AppKit...");
        createAppKit({
          adapters: [wagmiAdapter, solanaWeb3JsAdapter],
          projectId,
          networks,
          metadata,
          themeMode: "light",
            features: { 
    analytics: true,
    socials: false, // Sometimes helps
    email: false
  },
  enableWalletConnect: true,
  enableInjected: true,
   enableCoinbase: true,
   enableWallets: true,
  
  // Force wallets to be clickable even if not "detected"
  allWallets: 'SHOW', 
        });

        const result = {
          AppKitProvider: AKProvider,
          WagmiProvider: WagmiProv,
          QueryClientProvider: QCProvider,
          queryClient: qc,
          wagmiConfig: wagmiAdapter.wagmiConfig,
        };

        // ✅ Cache for future mounts
        cachedProviders = result;
        isInitialized = true;

        console.log("✅ [Web3Provider] Initialization complete and cached");
        return result;
      } catch (err) {
        console.error("❌ [Web3Provider] Initialization error:", err);
        initializationPromise = null; // Reset so we can retry
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

  console.log("🌐 [Web3Provider] Render", {
    hasProviders: !!providers,
    isInitialized,
    loadingError,
  });

  // Error state
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

  // Loading state
  if (!providers) {
    return <Web3LoadingFallback />;
  }

  // Ready state
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