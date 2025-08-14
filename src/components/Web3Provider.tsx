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
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Web3 Connection Failed</h2>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => window.history.back()}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connecting to Web3</h2>
          <p className="text-gray-600 text-sm mb-4">Loading blockchain connectivity...</p>
          <div className="text-xs text-gray-500">
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