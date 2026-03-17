// src/components/MiniAppWeb3Provider.tsx
import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface Props {
  children: React.ReactNode;
}

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_MAINNET_RPC = 'https://mainnet.base.org';

type State =
  | { status: 'loading' }
  | { status: 'miniapp'; Providers: React.FC<{ children: React.ReactNode }> }
  | { status: 'browser' };

async function buildMiniAppProviders(ethProvider: any) {
  const [wagmiModule, queryModule, viemModule] = await Promise.all([
    import('wagmi'),
    import('@tanstack/react-query'),
    import('viem/chains'),
  ]);
  const { createConfig, WagmiProvider, injected } = wagmiModule;
  const { QueryClient, QueryClientProvider } = queryModule;
  const { base } = viemModule;
  const { http } = await import('wagmi');

  const miniAppConnector = injected({
    target: () => ({ id: 'miniapp', name: 'Base Mini App', provider: ethProvider }),
  });

  const config = createConfig({
    chains: [base],
    transports: { [base.id]: http(BASE_MAINNET_RPC) },
    connectors: [miniAppConnector],
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 90_000, gcTime: 600_000 } },
  });

  try {
    const { connect } = await import('wagmi/actions');
    await connect(config, { connector: miniAppConnector });
  } catch (e) {
    console.warn('[MiniAppWeb3Provider] Auto-connect warning:', e);
  }

  try {
    const chainIdHex = '0x' + BASE_MAINNET_CHAIN_ID.toString(16);
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (e) {
    console.warn('[MiniAppWeb3Provider] Chain switch warning:', e);
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
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const context = await sdk.context;
        if (cancelled) return;

        if (context?.user?.fid) {
          const ethProvider = (sdk.wallet as any)?.ethProvider;
          if (!ethProvider) {
            if (!cancelled) setState({ status: 'browser' });
            return;
          }
          const Providers = await buildMiniAppProviders(ethProvider);
          if (!cancelled) setState({ status: 'miniapp', Providers });
        } else {
          if (!cancelled) setState({ status: 'browser' });
        }
      } catch {
        if (!cancelled) setState({ status: 'browser' });
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-sm opacity-75">Connecting wallet…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'miniapp') {
    const { Providers } = state;
    return <Providers>{children}</Providers>;
  }

  // Browser mode: children already have AppKit providers above them.
  // Do NOT mount another WagmiProvider here.
  return <>{children}</>;
};