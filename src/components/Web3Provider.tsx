// src/components/Web3Provider.tsx - Updated with QueryClient
import React, { useEffect, useState } from 'react';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [WagmiProviderComponent, setWagmiProviderComponent] = useState<any>(null);
  const [QueryClientProviderComponent, setQueryClientProviderComponent] = useState<any>(null);
  const [wagmiConfig, setWagmiConfig] = useState<any>(null);
  const [queryClient, setQueryClient] = useState<any>(null);

  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        console.log('🚀 Lazy loading Web3 dependencies...');
        
        // Dynamically import ALL Web3 dependencies including QueryClient
        const [
          { createAppKit },
          { WagmiProvider },
          { QueryClient, QueryClientProvider },
          { projectId, metadata, networks, wagmiAdapter, solanaWeb3JsAdapter }
        ] = await Promise.all([
          import('@reown/appkit/react'),
          import('wagmi'),
          import('@tanstack/react-query'),
          import('../config')
        ]);

        // Create QueryClient for wagmi (fix cacheTime -> gcTime)
        const client = new QueryClient({
          defaultOptions: {
            queries: {
              staleTime: 60 * 1000, // 1 minute
              gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in older versions)
            },
          },
        });

        // Initialize AppKit
        console.log('📦 Creating AppKit modal...');
        createAppKit({
          adapters: [wagmiAdapter, solanaWeb3JsAdapter],
          projectId,
          networks,
          metadata,
          themeMode: 'light',
          features: {
            analytics: true
          }
        });

        // Store the components for rendering
        setWagmiProviderComponent(() => WagmiProvider);
        setQueryClientProviderComponent(() => QueryClientProvider);
        setWagmiConfig(wagmiAdapter.wagmiConfig);
        setQueryClient(client);
        
        console.log('✅ Web3 initialization complete');
        setIsInitialized(true);
      } catch (err) {
        console.error('❌ Web3 initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown Web3 error');
      }
    };

    initializeWeb3();
  }, []);

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50">
        <div className="mx-auto max-w-md p-6 text-center">
          <div className="mb-4 text-4xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-red-800">Web3 Connection Failed</h2>
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => window.history.back()}
              className="w-full rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isInitialized || !WagmiProviderComponent || !QueryClientProviderComponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <h2 className="heading-2">Connecting to Web3</h2>
          <p className="text-fg/70 mb-4 text-sm">Loading blockchain connectivity...</p>
          <div className="text-fg/60 text-xs">
            <p>• Initializing wallet connections</p>
            <p>• Setting up blockchain networks</p>
            <p>• Preparing smart contracts</p>
          </div>
        </div>
      </div>
    );
  }

  // Render with Web3 providers in correct order
  return (
    <QueryClientProviderComponent client={queryClient}>
      <WagmiProviderComponent config={wagmiConfig}>
        {children}
      </WagmiProviderComponent>
    </QueryClientProviderComponent>
  );
};