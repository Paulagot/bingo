// src/components/chains/DynamicChainProvider.tsx
import React, { FC, Suspense, useMemo, useEffect } from 'react';
import type { SupportedChain } from '../../chains/types';
import { useWalletStore } from '../../stores/walletStore';
import { shallow } from 'zustand/shallow';

import { StellarWalletProvider } from '../../chains/stellar/StellarWalletProvider';
import { EvmWalletProvider } from '../../chains/evm/EvmWalletProvider';
import { SolanaWalletProvider } from '../../chains/solana/SolanaWalletProvider';
import { Web3Provider } from '../Web3Provider'; // ✅ use your Wagmi+Query wrapper

interface DynamicChainProviderProps {
  selectedChain: SupportedChain | null;
  children: React.ReactNode;
}

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

class ChainProviderErrorBoundary extends React.Component<
  { children: React.ReactNode; chain: SupportedChain | null },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; chain: SupportedChain | null }) {
    super(props);
    this.state = { hasError: false };
  }
  
  // ✅ FIX: Added 'override' modifier
  static override getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  // ✅ FIX: Added 'override' modifier
  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Failed to load ${this.props.chain} provider:`, error, errorInfo);
  }
  
  override render() {
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

export const DynamicChainProvider: FC<DynamicChainProviderProps> = ({ selectedChain, children }) => {
  const { setActiveChain, resetAllWallets } = useWalletStore(
    (s) => ({ setActiveChain: s.setActiveChain, resetAllWallets: s.resetAllWallets }),
    shallow
  );

  // ✅ Sync activeChain in store when selectedChain changes
  useEffect(() => {
    const state = useWalletStore.getState();
    if (selectedChain) {
      if (state.activeChain !== selectedChain) setActiveChain(selectedChain);
    } else {
      const anyConnected = !!(
        state.stellar?.isConnected || state.evm?.isConnected || state.solana?.isConnected
      );
      if (!anyConnected && state.activeChain !== null) {
        resetAllWallets();
      }
    }
  }, [selectedChain, setActiveChain, resetAllWallets]);

  // ✅ FIX: Memoize the provider component to prevent re-renders
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

  // ✅ FIX: Render wrapper with stable structure
  // Always render the same component tree, just with different content
  const renderContent = () => {
    // === EVM branch: must include Wagmi+Query providers ===
    if (selectedChain === 'evm' && ProviderComponent) {
      return (
        <ChainProviderErrorBoundary chain={selectedChain}>
          <Web3Provider>
            <ProviderComponent>
              <div data-testid="evm-wallet-mode">{children}</div>
            </ProviderComponent>
          </Web3Provider>
        </ChainProviderErrorBoundary>
      );
    }

    // Stellar: provider doesn't need Wagmi
    if (selectedChain === 'stellar' && ProviderComponent) {
      return (
        <ChainProviderErrorBoundary chain={selectedChain}>
          <ProviderComponent>
            <div data-testid="stellar-wallet-mode">{children}</div>
          </ProviderComponent>
        </ChainProviderErrorBoundary>
      );
    }

    // Solana: provider doesn't need Wagmi
    if (selectedChain === 'solana' && ProviderComponent) {
      return (
        <ChainProviderErrorBoundary chain={selectedChain}>
          <ProviderComponent>
            <div data-testid="solana-wallet-mode">{children}</div>
          </ProviderComponent>
        </ChainProviderErrorBoundary>
      );
    }

    // No wallet mode - just render children directly
    return <div data-testid="no-wallet-mode">{children}</div>;
  };

  return <>{renderContent()}</>;
};

export const useDynamicChain = () => {
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






