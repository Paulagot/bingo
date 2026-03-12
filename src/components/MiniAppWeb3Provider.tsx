// src/components/MiniAppWeb3Provider.tsx
//
// Replaces Web3Provider for the /mini-app/host route.
//
// When running inside the Base mini app:
//   - Uses sdk.wallet.ethProvider (EIP-1193) as the wagmi connector
//   - Locked to Base mainnet (chain 8453)
//   - No Reown/AppKit modal needed
//
// When running outside the Base mini app (sdk provider not available):
//   - Falls back to the normal Web3Provider (Reown/AppKit)
//   - No double WalletProvider — Web3Provider mounts its own internally

import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniAppContext } from '../context/MiniAppContext';
import { Web3Provider } from './Web3Provider';
import { WalletProvider } from '../context/WalletContext';

interface Props {
  children: React.ReactNode;
  roomConfig?: {
    web3Chain?: string;
    evmNetwork?: string;
    solanaCluster?: string;
    stellarNetwork?: string;
  };
}

type ProviderState =
  | { status: 'loading' }
  | { status: 'miniapp'; Providers: React.FC<{ children: React.ReactNode }> }
  | { status: 'fallback' };

// ✅ Base mainnet config — used everywhere in this file
const BASE_MAINNET_ROOM_CONFIG = {
  web3Chain: 'evm',
  evmNetwork: 'base',
} as const;

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_MAINNET_RPC = 'https://mainnet.base.org';

const LoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
    <div className="text-center text-white">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <p className="text-sm opacity-75">Connecting wallet…</p>
    </div>
  </div>
);

// Build a wagmi config backed by the Base SDK EIP-1193 provider
// ✅ Locked to Base mainnet (8453), not Base Sepolia
async function buildMiniAppWagmiProviders(ethProvider: any) {
  const [wagmiModule, queryModule, viemModule] = await Promise.all([
    import('wagmi'),
    import('@tanstack/react-query'),
    import('viem/chains'),
  ]);

  const { createConfig, WagmiProvider, injected } = wagmiModule;
  const { QueryClient, QueryClientProvider } = queryModule;
  const { base } = viemModule; // ✅ base mainnet, not baseSepolia
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
    chains: [base], // ✅ Base mainnet
    transports: {
      [base.id]: http(BASE_MAINNET_RPC),
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

  // ✅ Switch to Base mainnet, not Base Sepolia
  try {
    const chainIdHex = '0x' + BASE_MAINNET_CHAIN_ID.toString(16); // '0x2105'
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    console.log('[MiniAppWeb3Provider] ✅ Switched to Base mainnet:', BASE_MAINNET_CHAIN_ID);
  } catch (e) {
    console.warn('[MiniAppWeb3Provider] ⚠️ Chain switch warning:', e);
  }

  // ✅ WalletProvider uses Base mainnet config — single instance, no double-wrapping
  const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider roomConfig={BASE_MAINNET_ROOM_CONFIG}>
          {children}
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );

  return Providers;
}

export const MiniAppWeb3Provider: React.FC<Props> = ({ children, roomConfig }) => {
  const { isMiniApp, isLoading: contextLoading } = useMiniAppContext();
  const [state, setState] = useState<ProviderState>({ status: 'loading' });

  useEffect(() => {
    // Wait for MiniAppContext to resolve first
    if (contextLoading) return;

    let cancelled = false;

    async function init() {
      if (!isMiniApp) {
        // Not in mini app — use normal Web3Provider (it mounts its own WalletProvider)
        if (!cancelled) setState({ status: 'fallback' });
        return;
      }

      try {
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
    // ✅ Web3Provider mounts its own WalletProvider internally — do NOT add another one here.
    // Pass roomConfig through so Web3Provider uses the right network.
    // Default to Base mainnet if no roomConfig provided (e.g. on the mini-app host route).
    return (
      <Web3Provider force roomConfig={roomConfig ?? BASE_MAINNET_ROOM_CONFIG}>
        {children}
      </Web3Provider>
    );
  }

  // Inside mini app — use SDK-backed wagmi config with its own WalletProvider
  const { Providers } = state;
  return <Providers>{children}</Providers>;
};