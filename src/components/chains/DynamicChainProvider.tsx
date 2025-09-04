//src/components/chains/DynamicChainProvider.tsx

import React, { FC, Suspense, useMemo, useEffect } from 'react';
import type { SupportedChain } from '../../chains/types';
import { useWalletStore } from '../../stores/walletStore';

// Lazy load chain providers for performance
import { StellarWalletProvider } from '../../chains/stellar/StellarWalletProvider';

// Placeholder for future EVM provider
const EvmWalletProvider = React.lazy(() => 
  Promise.resolve({ 
    default: ({ children }: { children: React.ReactNode }) => <>{children}</> 
  })
);

// Placeholder for future Solana provider  
const SolanaWalletProvider = React.lazy(() => 
  Promise.resolve({ 
    default: ({ children }: { children: React.ReactNode }) => <>{children}</> 
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
            <div className="text-red-600">
              ⚠️ Failed to load {this.props.chain} wallet provider
            </div>
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
 * based on the selected chain from quiz setup configuration.
 * 
 * Features:
 * - Lazy loading for performance optimization
 * - Fallback to no-wallet mode when no chain is selected
 * - Loading states and error boundaries
 * - Integration with walletStore for state management
 * - TypeScript strict compliance
 */
export const DynamicChainProvider: FC<DynamicChainProviderProps> = ({
  selectedChain,
  children
}) => {
  //  console.log('🔗 DynamicChainProvider render - selectedChain:', selectedChain);
  const { setActiveChain, resetAllWallets } = useWalletStore();

  // Update active chain in store when selection changes
  useEffect(() => {
    if (selectedChain) {
      setActiveChain(selectedChain);
    } else {
      // Reset all wallets when no chain is selected
      resetAllWallets();
    }
  }, [selectedChain, setActiveChain, resetAllWallets]);

  // Memoized provider selection for performance
  const ProviderComponent = useMemo(() => {
    console.log('🔗 DynamicChainProvider useEffect - selectedChain changed to:', selectedChain);
    switch (selectedChain) {
      case 'stellar':
        console.log('🔗 Selecting StellarWalletProvider');
        return StellarWalletProvider;        
      case 'evm':
        return EvmWalletProvider;
      case 'solana':
        return SolanaWalletProvider;
      default:
         console.log('🔗 No provider selected');
        return null;
    }
  }, [selectedChain]);

  // For stellar, skip Suspense since it's not lazy loaded
if (selectedChain === 'stellar' && ProviderComponent) {
  return (
    <ChainProviderErrorBoundary chain={selectedChain}>
      <ProviderComponent>
        <div data-testid={`${selectedChain}-wallet-mode`}>
          {children}
        </div>
      </ProviderComponent>
    </ChainProviderErrorBoundary>
  );
}

  // No wallet mode - render children directly
  if (!selectedChain || !ProviderComponent) {
    // console.log('🔗 DynamicChainProvider rendering in no-wallet mode');
    return (
      <div data-testid="no-wallet-mode">
        {children}
      </div>
    );
  }

  //  console.log('🔗 DynamicChainProvider rendering with provider for:', selectedChain);

  // Chain-specific provider with lazy loading
  return (
    <ChainProviderErrorBoundary chain={selectedChain}>
      <Suspense fallback={<ChainProviderSuspense chain={selectedChain} />}>
        <ProviderComponent>
          <div data-testid={`${selectedChain}-wallet-mode`}>
            {children}
          </div>
        </ProviderComponent>
      </Suspense>
    </ChainProviderErrorBoundary>
  );
};

/**
 * Hook to get the current dynamic chain state
 */
export const useDynamicChain = () => {
  const { activeChain, stellar, evm, solana } = useWalletStore();
  
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




