// src/components/MiniAppWeb3Provider.tsx
//
// Replaces Web3Provider for the /mini-app/host route.
//
// When running inside the Base mini app:
//   - Uses sdk.wallet.ethProvider (EIP-1193) as the wagmi connector
//   - Locked to Base Sepolia
//   - No Reown/AppKit modal needed
//
// When running outside the Base mini app (sdk provider not available):
//   - Falls back to the normal Web3Provider (Reown/AppKit)

import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniAppContext } from '../context/MiniAppContext';
import { Web3Provider } from './Web3Provider';

interface Props {
  children: React.ReactNode;
}

type ProviderState =
  | { status: 'loading' }
  | { status: 'miniapp'; Providers: React.FC<{ children: React.ReactNode }> }
  | { status: 'fallback' };

const LoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
    <div className="text-center text-white">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <p className="text-sm opacity-75">Connecting wallet…</p>
    </div>
  </div>
);

// Build a wagmi config backed by the Base SDK EIP-1193 provider
async function buildMiniAppWagmiProviders(ethProvider: any) {
  const [wagmiModule, queryModule, viemModule] = await Promise.all([
    import('wagmi'),
    import('@tanstack/react-query'),
    import('viem/chains'),
  ]);

  const { createConfig, WagmiProvider, injected } = wagmiModule;
  const { QueryClient, QueryClientProvider } = queryModule;
  const { baseSepolia } = viemModule;
  const { http } = await import('wagmi');

  // Wrap the EIP-1193 provider so wagmi's injected connector picks it up
  const miniAppConnector = injected({
    target: () => ({
      id: 'miniapp',
      name: 'Base Mini App',
      provider: ethProvider,
    }),
  });

  const config = createConfig({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },
    connectors: [miniAppConnector],
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 90_000, gcTime: 600_000 } },
  });

  // Auto-connect on mount
  const { connect } = await import('wagmi/actions');
  try {
    await connect(config, { connector: miniAppConnector });
  } catch (e) {
    // Already connected or connection failed — not fatal
    console.warn('[MiniAppWeb3Provider] Auto-connect warning:', e);
  }

  const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );

  return Providers;
}

export const MiniAppWeb3Provider: React.FC<Props> = ({ children }) => {
  const { isMiniApp, isLoading: contextLoading } = useMiniAppContext();
  const [state, setState] = useState<ProviderState>({ status: 'loading' });

  useEffect(() => {
    // Wait for MiniAppContext to resolve first
    if (contextLoading) return;

    let cancelled = false;

    async function init() {
      if (!isMiniApp) {
        // Not in mini app — use normal Web3Provider
        if (!cancelled) setState({ status: 'fallback' });
        return;
      }

      try {
        // sdk.wallet.ethProvider is the EIP-1193 provider
        const ethProvider = (sdk.wallet as any)?.ethProvider;

        if (!ethProvider) {
          console.warn('[MiniAppWeb3Provider] No ethProvider on sdk.wallet, falling back');
          if (!cancelled) setState({ status: 'fallback' });
          return;
        }

        const Providers = await buildMiniAppWagmiProviders(ethProvider);
        if (!cancelled) setState({ status: 'miniapp', Providers });
      } catch (err) {
        console.error('[MiniAppWeb3Provider] Failed to build mini app providers:', err);
        if (!cancelled) setState({ status: 'fallback' });
      }
    }

    init();
    return () => { cancelled = true; };
  }, [isMiniApp, contextLoading]);

  if (state.status === 'loading') {
    return <LoadingScreen />;
  }

  if (state.status === 'fallback') {
    // Outside mini app — fall back to Reown/AppKit as normal
    return (
      <Web3Provider force>
        {children}
      </Web3Provider>
    );
  }

  // Inside mini app — use SDK-backed wagmi config
  const { Providers } = state;
  return <Providers>{children}</Providers>;
};