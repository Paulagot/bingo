// src/components/chains/DynamicChainProvider.tsx
import React, { FC, Suspense, useMemo, useEffect } from 'react';
import type { SupportedChain } from '../../chains/types';
import { useWalletStore } from '../../stores/walletStore';
import shallow from 'zustand/shallow'; // ✅ import shallow

// Lazy load chain providers for performance
import { StellarWalletProvider } from '../../chains/stellar/StellarWalletProvider';

// Placeholder for future EVM provider
const EvmWalletProvider = React.lazy(() =>
  Promise.resolve({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  })
);

// Placeholder for future Solana provider
const SolanaWalletProvider = React.lazy(() =>
  Promise.resolve({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  })
);

interface DynamicChainProviderProps {
  selectedChain: SupportedChain | null;
  children: React.ReactNode;
}

/**
 * Loading fallback component for chain providers
 */
const ChainProviderSuspense: FC<{ chain: SupportedChain }> = ({ chain }) => (
  <div className="flex min-h-32 items-center justify-center">
    <div className="flex flex-col items-center space-y-2">
      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
      <span className="text-fg/70 text-sm">
        Initializing {chain.charAt(0).toUpperCase() + chain.slice(1)} wallet...
      </span>
    </div>
  </div>
);

/**
 * Error boundary for chain provider loading failures
 */
class ChainProviderErrorBoundary extends React.Component<
  { children: React.ReactNode; chain: SupportedChain | null },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; chain: SupportedChain | null }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Failed to load ${this.props.chain} provider:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-32 items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="text-red-600">⚠️ Failed to load {this.props.chain} wallet provider</div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Dynamic provider that conditionally loads chain-specific wallet providers
 */
export const DynamicChainProvider: FC<DynamicChainProviderProps> = ({ selectedChain, children }) => {
  // Only subscribe to the actions; use getState() for comparisons inside the effect
  const { setActiveChain, resetAllWallets } = useWalletStore(
    (s) => ({ setActiveChain: s.setActiveChain, resetAllWallets: s.resetAllWallets }),
    shallow // ✅ avoids rerenders if actions object identity doesn't change
  );

  // Update active chain in store when selection changes (idempotent)
  useEffect(() => {
    const state = useWalletStore.getState(); // read synchronously without subscribing

    if (selectedChain) {
      if (state.activeChain !== selectedChain) {
        // only write if different
        setActiveChain(selectedChain);
      }
    } else {
      const anyConnected = !!(
        state.stellar?.isConnected || state.evm?.isConnected || state.solana?.isConnected
      );
      // only reset if it would actually change something
      if (!anyConnected && state.activeChain !== null) {
        resetAllWallets();
      }
    }
  }, [selectedChain, setActiveChain, resetAllWallets]);

  // Memoized provider selection for performance
  const ProviderComponent = useMemo(() => {
    switch (selectedChain) {
      case 'stellar':
        return StellarWalletProvider;
      case 'evm':
        return EvmWalletProvider;
      case 'solana':
        return SolanaWalletProvider;
      default:
        return null;
    }
  }, [selectedChain]);

  // For stellar, skip Suspense since it's not lazy loaded
  if (selectedChain === 'stellar' && ProviderComponent) {
    return (
      <ChainProviderErrorBoundary chain={selectedChain}>
        <ProviderComponent>
          <div data-testid={`${selectedChain}-wallet-mode`}>{children}</div>
        </ProviderComponent>
      </ChainProviderErrorBoundary>
    );
  }

  // No wallet mode - render children directly
  if (!selectedChain || !ProviderComponent) {
    return <div data-testid="no-wallet-mode">{children}</div>;
  }

  // Chain-specific provider with lazy loading
  return (
    <ChainProviderErrorBoundary chain={selectedChain}>
      <Suspense fallback={<ChainProviderSuspense chain={selectedChain} />}>
        <ProviderComponent>
          <div data-testid={`${selectedChain}-wallet-mode`}>{children}</div>
        </ProviderComponent>
      </Suspense>
    </ChainProviderErrorBoundary>
  );
};

/**
 * Hook to get the current dynamic chain state
 */
export const useDynamicChain = () => {
  // ✅ Use a selector + shallow so unchanged slices don't re-render consumers
  const { activeChain, stellar, evm, solana } = useWalletStore(
    (s) => ({
      activeChain: s.activeChain,
      stellar: s.stellar,
      evm: s.evm,
      solana: s.solana,
    }),
    shallow
  );

  const currentWallet = useMemo(() => {
    switch (activeChain) {
      case 'stellar':
        return stellar;
      case 'evm':
        return evm;
      case 'solana':
        return solana;
      default:
        return null;
    }
  }, [activeChain, stellar, evm, solana]);

  return {
    activeChain,
    currentWallet,
    isWalletConnected: currentWallet?.isConnected ?? false,
    isWalletConnecting: currentWallet?.isConnecting ?? false,
    walletError: currentWallet?.error ?? null,
  };
};





