//src/chains/evm/EvmWalletProvider.tsx
import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { parseEther } from 'viem';
import {
  useAccount,
  useDisconnect,
  useSendTransaction,
  useChainId,
  useSwitchChain,
  useConnect,
} from 'wagmi';
import type {
  EvmChainProvider,
  EvmTransactionParams,
  WalletConnectionResult,
} from '../types';
import { useWalletStore } from '../../stores/walletStore';
import { useQuizSetupStore } from '../../components/Quiz/hooks/useQuizSetupStore';

// ✅ Import the single source of truth
import { EVM_NETWORKS, getMetaByKey, getKeyById, type EvmNetworkKey } from './config/networks';

// ✅ Build lookup maps dynamically from networks.ts
const buildChainIdMap = () => {
  const map: Record<string, number> = {};
  Object.entries(EVM_NETWORKS).forEach(([key, network]) => {
    map[key] = network.id;
  });
  return map;
};

const buildExplorerMap = () => {
  const map: Record<number, string> = {};
  Object.entries(EVM_NETWORKS).forEach(([, network]) => {
    map[network.id] = network.explorer;
  });
  return map;
};

const buildRpcMap = () => {
  const map: Record<number, string> = {};
  Object.entries(EVM_NETWORKS).forEach(([, network]) => {
    map[network.id] = network.rpc;
  });
  return map;
};

// ✅ Dynamic maps that include ALL chains
const EVM_KEY_TO_ID = buildChainIdMap();
const EXPLORER_BY_ID = buildExplorerMap();
// Note: RPC_BY_ID available for future use if needed
const RPC_BY_ID = buildRpcMap();
// Suppress unused variable warning - keeping for consistency with networks.ts
void RPC_BY_ID;

type CtxType =
  | (EvmChainProvider & {
      address: string | null;
      isConnected: boolean;
    })
  | null;

const Ctx = createContext<CtxType>(null);
export const useEvmProvider = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('EvmWalletProvider missing');
  return ctx;
};

export const EvmWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // wagmi hooks
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { connectors, connectAsync } = useConnect();

  // ✅ Get target network from setup config
const { setupConfig } = useQuizSetupStore();

// Priority: 1) setupConfig (host creating room), 2) sessionStorage (player joining room)
const evmNetworkKey = (
  (setupConfig as any)?.evmNetwork ||
  (typeof window !== 'undefined' ? sessionStorage.getItem('active-evm-network') : null) ||
  undefined
) as EvmNetworkKey | undefined;

// ✅ Use dynamic lookup - will work for ALL networks
const targetChainId = evmNetworkKey ? EVM_KEY_TO_ID[evmNetworkKey] : undefined;


  console.log('🔍 [EvmWalletProvider] Config:', {
    evmNetworkKey,
    targetChainId,
    currentChainId: chainId,
    isConnected,
    address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
  });

  // Add this debug:
console.log('🔍 [EvmWalletProvider] Network resolution:', {
  fromSetupConfig: (setupConfig as any)?.evmNetwork,
  fromSessionStorage: sessionStorage.getItem('active-evm-network'),
  resolved: evmNetworkKey,
  targetChainId
});

  const ensureChain = useCallback(
    async (desiredId?: number) => {
      if (!desiredId) {
        console.warn('⚠️ [EvmWalletProvider] No target chain specified');
        return true;
      }
      
      if (chainId === desiredId) {
        console.log('✅ [EvmWalletProvider] Already on correct chain:', desiredId);
        return true;
      }

      console.log(`🔄 [EvmWalletProvider] Switching from chain ${chainId} to ${desiredId}...`);
      
      try {
        await switchChainAsync({ chainId: desiredId });
        console.log('✅ [EvmWalletProvider] Chain switch successful');
        return true;
      } catch (err) {
        console.error('❌ [EvmWalletProvider] Chain switch failed:', err);
        // Don't disconnect - let UI handle it
        return false;
      }
    },
    [chainId, switchChainAsync]
  );

  const connectedWithAddress = Boolean(address && isConnected);

  const connect = useCallback(async (): Promise<WalletConnectionResult> => {
    console.log('🔌 [EvmWalletProvider] Connect requested, target:', targetChainId);

    // If already connected, attempt to switch to target chain
    if (isConnected && address) {
      console.log('📌 [EvmWalletProvider] Wallet already connected, ensuring correct chain...');
      const switched = await ensureChain(targetChainId);
      
      // ✅ Use helper to get network metadata
      const networkKey = getKeyById(chainId);
      const networkMeta = getMetaByKey(networkKey);
      
      return {
        success: true,
        address,
        networkInfo: {
          chainId: chainId ?? 'unknown',
          name: networkMeta?.name ?? 'EVM',
          isTestnet: networkKey?.toLowerCase().includes('testnet') || 
                     networkKey?.toLowerCase().includes('sepolia') ||
                     networkKey?.toLowerCase().includes('fuji') ||
                     networkKey?.toLowerCase().includes('amoy'),
          rpcUrl: networkMeta?.rpc ?? '',
          blockExplorer: networkMeta?.explorer ?? '',
        },
        warning: switched ? undefined : `Connected but on wrong network. Please switch to ${getMetaByKey(evmNetworkKey)?.name ?? targetChainId}`,
      };
    }

    // Not connected - establish new connection
    console.log('🆕 [EvmWalletProvider] Establishing new connection...');
    const injected = connectors.find((c) => c.id === 'injected') ?? connectors[0];
    
    if (!injected) {
      console.error('❌ [EvmWalletProvider] No connector available');
      return { success: false, address: null };
    }

    try {
      await connectAsync({ connector: injected });
      console.log('✅ [EvmWalletProvider] Connection established');
    } catch (err) {
      console.error('❌ [EvmWalletProvider] Connection failed:', err);
      return { 
        success: false, 
        address: null,
        error: {
          message: err instanceof Error ? err.message : 'Connection failed',
          code: 'CONNECTION_FAILED' as any,
          timestamp: new Date()
        }
      };
    }

    // After connection, ensure we're on the right chain
    await ensureChain(targetChainId);

    // ✅ Use helpers for network info
    const networkKey = getKeyById(chainId);
    const networkMeta = getMetaByKey(networkKey);

    return {
      success: true,
      address: (address as string) ?? null,
      networkInfo: {
        chainId: chainId ?? 'unknown',
        name: networkMeta?.name ?? 'EVM',
        isTestnet: !!(networkKey?.toLowerCase().includes('testnet') || 
                     networkKey?.toLowerCase().includes('sepolia') ||
                     networkKey?.toLowerCase().includes('fuji') ||
                     networkKey?.toLowerCase().includes('amoy')),
        rpcUrl: networkMeta?.rpc ?? '',
        blockExplorer: networkMeta?.explorer ?? '',
      },
    };
  }, [isConnected, address, chainId, connectors, connectAsync, ensureChain, targetChainId, evmNetworkKey]);

  const disconnectWallet = useCallback(async () => {
    console.log('🔌 [EvmWalletProvider] Disconnecting...');
    const api = useWalletStore.getState?.();
    api?.updateEvmWallet({ isDisconnecting: true });
    
    try {
      await disconnect();
      console.log('✅ [EvmWalletProvider] Disconnected successfully');
    } finally {
      api?.updateEvmWallet({
        address: null,
        isConnected: false,
        isDisconnecting: false,
        error: null,
        chainId: undefined,
      });
      api?.setActiveChain?.(null as any);
    }
  }, [disconnect]);

  const switchChain = useCallback(
    async (toChainId: number) => {
      console.log(`🔄 [EvmWalletProvider] Manual chain switch to ${toChainId}...`);
      try {
        await switchChainAsync({ chainId: toChainId });
        console.log('✅ [EvmWalletProvider] Manual switch successful');
        return true;
      } catch (err) {
        console.error('❌ [EvmWalletProvider] Manual switch failed:', err);
        return false;
      }
    },
    [switchChainAsync]
  );

  const sendTransaction = useCallback(
    async (p: EvmTransactionParams) => {
      console.log('💸 [EvmWalletProvider] Sending transaction...', {
        to: p.to,
        amount: p.amount,
        chainId
      });

      try {
        const hash = await sendTransactionAsync({
          to: p.to as `0x${string}`,
          value: p.amount ? parseEther(p.amount) : 0n,
        });

        const explorer = EXPLORER_BY_ID[chainId];
        const explorerUrl = explorer ? `${explorer}/tx/${hash}` : undefined;

        console.log('✅ [EvmWalletProvider] Transaction sent:', hash);

        return {
          success: true,
          transactionHash: hash,
          explorerUrl,
        };
      } catch (err) {
        console.error('❌ [EvmWalletProvider] Transaction failed:', err);
        throw err;
      }
    },
    [sendTransactionAsync, chainId]
  );

  const notHere = (name: string) => () => {
    throw new Error(`${name}: use the EVM contract client SDK`);
  };

  // ✅ Auto-switch chain when target changes (e.g., user goes back and selects different network)
  useEffect(() => {
    // Only act if wallet is connected and target differs from current
    if (!isConnected || !address || !targetChainId) return;
    if (chainId === targetChainId) return;

    console.log(`⚠️ [EvmWalletProvider] Target chain mismatch detected!`, {
      current: chainId,
      target: targetChainId,
      networkKey: evmNetworkKey,
    });

    // Auto-switch (user can reject)
    const attemptSwitch = async () => {
      console.log(`🔄 [EvmWalletProvider] Auto-switching to ${targetChainId}...`);
      try {
        await switchChainAsync({ chainId: targetChainId });
        console.log('✅ [EvmWalletProvider] Auto-switch successful');
      } catch (err) {
        console.warn('⚠️ [EvmWalletProvider] Auto-switch rejected or failed:', err);
        // Don't disconnect - just leave them on wrong chain with warning in UI
      }
    };

    attemptSwitch();
  }, [targetChainId, chainId, isConnected, address, evmNetworkKey, switchChainAsync]);

  // ✅ Listen for window events from useWalletActions
  useEffect(() => {
    const handleConnectRequest = () => {
      if (isConnected) return; // already connected
      console.log('[EvmWalletProvider] Received connect request via event');
      connect().catch(console.error);
    };

    const handleDisconnectRequest = () => {
      if (!isConnected) return;
      console.log('[EvmWalletProvider] Received disconnect request via event');
      disconnectWallet().catch(console.error);
    };

    const handleSwitchChainRequest = (e: Event) => {
      const chainId = (e as CustomEvent).detail?.chainId;
      if (typeof chainId === 'number') {
        console.log('[EvmWalletProvider] Received switch chain request:', chainId);
        switchChain(chainId).catch(console.error);
      }
    };

    window.addEventListener('evm:request-connect', handleConnectRequest);
    window.addEventListener('evm:request-disconnect', handleDisconnectRequest);
    window.addEventListener('evm:request-switch-chain', handleSwitchChainRequest as EventListener);

    return () => {
      window.removeEventListener('evm:request-connect', handleConnectRequest);
      window.removeEventListener('evm:request-disconnect', handleDisconnectRequest);
      window.removeEventListener('evm:request-switch-chain', handleSwitchChainRequest as EventListener);
    };
  }, [isConnected, connect, disconnectWallet, switchChain]);

  // ✅ Sync wagmi state to global wallet store
  useEffect(() => {
    const api = useWalletStore.getState?.();
    if (!api) return;

    if (!connectedWithAddress) {
      api.updateEvmWallet({
        address: null,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        chain: 'evm',
        error: null,
        chainId: undefined,
      });
      return;
    }

    // ✅ Use helper to get network name
    const networkKey = getKeyById(chainId);
    const networkMeta = getMetaByKey(networkKey);

    console.log('📊 [EvmWalletProvider] Syncing to store:', {
      address: `${address?.slice(0, 6)}...${address?.slice(-4)}`,
      chainId,
      networkKey,
      networkName: networkMeta?.name
    });

    api.updateEvmWallet({
      address: address || null,
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      chain: 'evm',
      error: null,
      chainId,
      lastConnected: new Date(),
    });
    api.setActiveChain?.('evm' as any);
  }, [connectedWithAddress, address, chainId]);

  const value = useMemo<CtxType>(
    () => ({
      // Base ChainProvider
      connect,
      disconnect: disconnectWallet,
      getBalance: async () => '0',
      getAccountInfo: async () => ({ 
        address: (address ?? '') as string, 
        balance: '0', 
        nativeBalance: '0' 
      }),
      sendTransaction,
      estimateTransactionFee: async () => '0',
      onAccountChange: undefined,
      onNetworkChange: undefined,
      onDisconnect: undefined,

      // Evm extras
      connectWithWallet: async () => connect(),
      switchChain,
      addChain: async () => false,
      callContract: notHere('callContract'),
      estimateGas: notHere('estimateGas'),
      addToken: async () => false,
      getTokenBalance: async () => '0',
      approveToken: notHere('approveToken'),
      sendTokenTransfer: sendTransaction,
      getChainId: async () => chainId,
      getBlockNumber: async () => 0,
      getGasPrice: async () => '0',

      // convenience
      address: (address ?? null) as string | null,
      isConnected: connectedWithAddress,
    }),
    [connect, disconnectWallet, address, connectedWithAddress, sendTransaction, switchChain, chainId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};