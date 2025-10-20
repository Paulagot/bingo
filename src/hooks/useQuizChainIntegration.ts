// src/hooks/useQuizChainIntegration.ts
import { useMemo } from 'react';
import { useQuizSetupStore } from '../components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '../components/Quiz/hooks/useQuizConfig';
import { useWalletStore } from '../stores/walletStore';
import type { SupportedChain } from '../chains/types';

// ✅ Use the central networks config to avoid drift
import { getMetaByKey, getKeyById, type EvmNetworkKey } from '../chains/evm/config/networks';

const SOLANA_NAME_BY_CLUSTER: Record<string, string> = {
  mainnet: 'Solana',
  devnet: 'Solana (Devnet)',
};

const hasPositiveAmount = (value: unknown): boolean => {
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return !Number.isNaN(n) && n > 0;
  }
  return false;
};

type Options = { chainOverride?: SupportedChain | null };

export const useQuizChainIntegration = (opts?: Options) => {
  const { setupConfig } = useQuizSetupStore();
  const { config } = useQuizConfig();

  const { activeChain, stellar, evm, solana } = useWalletStore((s) => ({
    activeChain: s.activeChain as SupportedChain | null,
    stellar: s.stellar,
    evm: s.evm,       // should include .chainId if your EvmWalletProvider syncs it
    solana: s.solana, // may include .cluster if wired
  }));

  // Coarse chain kind ('stellar' | 'evm' | 'solana')
  const selectedChain: SupportedChain | null = useMemo(() => {
    if (opts?.chainOverride) return opts.chainOverride;
    if (activeChain) return activeChain;

    const dash = (config?.web3Chain ?? config?.web3ChainConfirmed) as SupportedChain | undefined;
    if (dash === 'stellar' || dash === 'evm' || dash === 'solana') return dash;

    const setup = setupConfig?.web3Chain as SupportedChain | undefined;
    if (setup === 'stellar' || setup === 'evm' || setup === 'solana') return setup;

    return null;
  }, [opts?.chainOverride, activeChain, config?.web3Chain, config?.web3ChainConfirmed, setupConfig?.web3Chain]);

  const currentWallet = useMemo(() => {
    switch (selectedChain) {
      case 'stellar': return stellar;
      case 'evm':     return evm;
      case 'solana':  return solana;
      default:        return undefined;
    }
  }, [selectedChain, stellar, evm, solana]);

  const isWalletConnected  = !!currentWallet?.isConnected;
  const isWalletConnecting = !!currentWallet?.isConnecting;
  const walletError        = currentWallet?.error;
  const walletAddress      = currentWallet?.address;

  // 🔹 The selected EVM subnetwork key (e.g., 'base', 'optimismSepolia', etc.)
  const selectedEvmNetwork = (setupConfig as any)?.evmNetwork as EvmNetworkKey | undefined;

  // Network-aware display name, sourced from networks.ts
  const getNetworkDisplayName = (chain?: SupportedChain | null): string => {
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';

    if (c === 'stellar') {
      const stellarNet = (setupConfig as any)?.stellarNetwork; // 'public' | 'testnet' (if present)
      return stellarNet === 'public' ? 'Stellar (Mainnet)'
           : stellarNet === 'testnet' ? 'Stellar (Testnet)'
           : 'Stellar';
    }

    if (c === 'solana') {
      const cluster = (setupConfig as any)?.solanaCluster || (solana as any)?.cluster || 'mainnet';
      return SOLANA_NAME_BY_CLUSTER[cluster] ?? 'Solana';
    }

    // EVM: prefer the configured network key, otherwise fall back to the connected chainId
    const metaFromKey = getMetaByKey(selectedEvmNetwork);
    if (metaFromKey?.name) return metaFromKey.name;

    const chainId = (evm as any)?.chainId as number | undefined;
    if (typeof chainId === 'number') {
      const keyFromId = getKeyById(chainId);
      const metaFromId = getMetaByKey(keyFromId);
      if (metaFromId?.name) return metaFromId.name;
    }

    return 'EVM';
  };

  // Family label only
  const getChainDisplayName = (chain?: SupportedChain | null): string => {
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';
    return c === 'stellar' ? 'Stellar' : c === 'solana' ? 'Solana' : 'EVM';
  };

  const isWalletRequired = useMemo(() => {
    if (!selectedChain) return false;
    const fee = config?.entryFee ?? setupConfig?.entryFee;
    return hasPositiveAmount(fee);
  }, [selectedChain, config?.entryFee, setupConfig?.entryFee]);

  const isWalletSetupComplete = useMemo(() => {
    if (!isWalletRequired) return true;
    if (!selectedChain) return false;
    return isWalletConnected;
  }, [isWalletRequired, selectedChain, isWalletConnected]);

  const walletReadiness = useMemo(() => {
    const net = getNetworkDisplayName();
    if (!isWalletRequired) {
      return { status: 'not-required' as const, message: 'No wallet required for this quiz', canProceed: true };
    }
    if (!selectedChain) {
      return { status: 'no-chain' as const, message: 'No blockchain selected', canProceed: false };
    }
    if (isWalletConnecting) {
      return { status: 'connecting' as const, message: `Connecting to ${net}…`, canProceed: false };
    }
    if (walletError) {
      return { status: 'error' as const, message: `Wallet error: ${walletError.message}`, canProceed: false };
    }
    if (!isWalletConnected) {
      return { status: 'disconnected' as const, message: `${net} wallet not connected`, canProceed: false };
    }
    return { status: 'ready' as const, message: `${net} wallet connected and ready`, canProceed: true };
  }, [isWalletRequired, selectedChain, isWalletConnecting, walletError, isWalletConnected]);

  const isUsingChain = (chain: SupportedChain): boolean => selectedChain === chain;

  const getFormattedAddress = (short = true): string | null => {
    if (!walletAddress) return null;
    if (!short) return walletAddress;
    return walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;
  };

  return {
    // selection
    selectedChain,
    selectedEvmNetwork, // 🔹 expose for debug/consumers
    activeChain,

    // wallet state
    currentWallet,
    isWalletConnected,
    isWalletConnecting,
    walletError,

    // quiz logic
    isWalletRequired,
    isWalletSetupComplete,
    walletReadiness,

    // helpers
    isUsingChain,
    getChainDisplayName,    // family ("EVM", "Stellar", "Solana")
    getNetworkDisplayName,  // network-aware ("Base", "OP Sepolia", "Avalanche Fuji", etc.)
    getFormattedAddress,

    // debug (handy in overlays)
    debugInfo: {
      setupConfig,
      config,
      activeChain,
      evmChainId: (evm as any)?.chainId,
      evmNetworkKey: selectedEvmNetwork,
      solanaCluster: (setupConfig as any)?.solanaCluster,
    },
  };
};

export default useQuizChainIntegration;



