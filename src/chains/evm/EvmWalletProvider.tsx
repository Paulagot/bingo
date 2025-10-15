// src/chains/evm/EvmWalletProvider.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
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

// ⬇️ bring in the user’s selected evm network from your quiz setup
import { useQuizSetupStore } from '../../components/Quiz/hooks/useQuizSetupStore';

// ---------------------------------------------------------
// AppKit is optional; guard its hooks at runtime
// ---------------------------------------------------------
let useAppKit: any = null;
let useAppKitAccount: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@reown/appkit/react');
  useAppKit = mod.useAppKit;
  useAppKitAccount = mod.useAppKitAccount;
} catch {
  // AppKit not available; fall back to wagmi connectors
}

// ---------------------------------------------------------
// Chain maps (add any other evm networks you support here)
// ---------------------------------------------------------
const EVM_KEY_TO_ID: Record<string, number> = {
  base: 8453,
  baseSepolia: 84532,
  polygon: 137,
  // polygonAmoy: 80002,
};

const EXPLORER_BY_ID: Record<number, string> = {
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
  137: 'https://polygonscan.com',
  // 80002: 'https://amoy.polygonscan.com',
};

const RPC_BY_ID: Record<number, string> = {
  8453: 'https://mainnet.base.org',
  84532: 'https://sepolia.base.org',
  137: 'https://polygon-rpc.com',
  // 80002: 'https://rpc-amoy.polygon.technology',
};

// ---------------------------------------------------------
// Context
// ---------------------------------------------------------
type CtxType =
  | (EvmChainProvider & { address: string | null; isConnected: boolean })
  | null;

const Ctx = createContext<CtxType>(null);

export const useEvmProvider = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('EvmWalletProvider missing');
  return ctx;
};

// ---------------------------------------------------------
// Provider
// ---------------------------------------------------------
export const EvmWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // wagmi
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { connectors, connectAsync } = useConnect();

  // AppKit (optional)
  const appkit = useAppKit ? useAppKit() : null;
  const appkitAcc = useAppKitAccount
    ? useAppKitAccount({ namespace: 'eip155' })
    : { address: undefined as string | undefined };

  // Quiz setup: where the user picked Base / Base Sepolia / Polygon
  const { setupConfig } = useQuizSetupStore();
  const evmNetworkKey = (setupConfig as any)?.evmNetwork as string | undefined;
  const targetChainId = evmNetworkKey ? EVM_KEY_TO_ID[evmNetworkKey] : undefined;

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  const ensureChain = useCallback(
    async (desiredId?: number) => {
      if (!desiredId) return true; // nothing to do
      if (chainId === desiredId) return true;
      try {
        await switchChainAsync({ chainId: desiredId });
        return true;
      } catch (err) {
        console.warn('[EVM] switchChain failed:', err);
        return false;
      }
    },
    [chainId, switchChainAsync]
  );

  // -------------------------------------------------------
  // Connect (network-aware + idempotent)
  // -------------------------------------------------------
  const connect = useCallback(async (): Promise<WalletConnectionResult> => {
    // 1) If already connected, try to move onto the desired network (no modal)
    if (isConnected || appkitAcc?.address) {
      await ensureChain(targetChainId);
      const addr = (address ?? appkitAcc?.address) ?? null;
      const cid = targetChainId ?? chainId;
      return {
        success: !!addr,
        address: addr,
        networkInfo: addr
          ? {
              chainId: cid ?? 'unknown',
              name: 'EVM',
              isTestnet: cid === 84532 /* Base Sepolia */ || cid === 80002 /* Polygon Amoy */,
              rpcUrl: cid ? RPC_BY_ID[cid] ?? '' : '',
              blockExplorer: cid ? EXPLORER_BY_ID[cid] ?? '' : '',
            }
          : undefined,
      };
    }

    // 2) Not connected → open AppKit if available, else wagmi connector
    if (appkit?.open) {
      // AppKit may let the user pick the chain in the modal;
      // we still enforce target network after the modal.
      await appkit.open({ view: 'Connect', namespace: 'eip155' });
    } else {
      const injected =
        connectors.find((c) => c.id === 'injected') ?? connectors[0];
      if (!injected) return { success: false, address: null };
      await connectAsync({ connector: injected });
    }

    // 3) Post-connect: enforce desired network (in case wallet kept previous one)
    await ensureChain(targetChainId);

    const addr = (address ?? appkitAcc?.address) ?? null;
    const cid = targetChainId ?? chainId;
    return {
      success: !!addr,
      address: addr,
      networkInfo: addr
        ? {
            chainId: cid ?? 'unknown',
            name: 'EVM',
            isTestnet: cid === 84532 || cid === 80002,
            rpcUrl: cid ? RPC_BY_ID[cid] ?? '' : '',
            blockExplorer: cid ? EXPLORER_BY_ID[cid] ?? '' : '',
          }
        : undefined,
    };
  }, [
    isConnected,
    appkitAcc?.address,
    address,
    chainId,
    appkit,
    connectors,
    connectAsync,
    ensureChain,
    targetChainId,
  ]);

  const disconnectWallet = useCallback(async () => {
    const api = useWalletStore.getState?.();
    api?.updateEvmWallet({ isDisconnecting: true });
    try {
      await disconnect();
    } finally {
      api?.updateEvmWallet({
        address: null,
        isConnected: false,
        isDisconnecting: false,
        error: null,
        chainId: undefined,
      });
    }
  }, [disconnect]);

  const switchChain = useCallback(
    async (toChainId: number) => {
      try {
        await switchChainAsync({ chainId: toChainId });
        return true;
      } catch {
        return false;
      }
    },
    [switchChainAsync]
  );

  const sendTransaction = useCallback(
    async (p: EvmTransactionParams) => {
      const hash = await sendTransactionAsync({
        to: p.to as `0x${string}`,
        value: p.amount ? parseEther(p.amount) : 0n,
      });
      const explorer = (chainId && EXPLORER_BY_ID[chainId]) || '';
      return {
        success: true,
        transactionHash: hash,
        explorerUrl: explorer ? `${explorer}/tx/${hash}` : undefined,
      };
    },
    [sendTransactionAsync, chainId]
  );

  const notHere =
    (name: string) =>
    () => {
      throw new Error(`${name}: use the EVM contract client SDK`);
    };

  // -------------------------------------------------------
  // React to user changing target network in the wizard
  // If connected and chain differs → switch
  // -------------------------------------------------------
  useEffect(() => {
    if (!targetChainId) return;
    if (!isConnected && !appkitAcc?.address) return;
    if (chainId === targetChainId) return;
    ensureChain(targetChainId);
  }, [targetChainId, chainId, isConnected, appkitAcc?.address, ensureChain]);

  // -------------------------------------------------------
  // Sync to global store for UI (like Stellar provider does)
  // -------------------------------------------------------
  useEffect(() => {
    const api = useWalletStore.getState?.();
    if (!api) return;

    api.updateEvmWallet({
      address: (address ?? appkitAcc?.address) || null,
      isConnected: !!(isConnected || appkitAcc?.address),
      isConnecting: false,
      isDisconnecting: false,
      chain: 'evm',
      error: null,
      chainId,
      lastConnected: isConnected || appkitAcc?.address ? new Date() : undefined,
    });

    if ((isConnected || appkitAcc?.address) && api.setActiveChain) {
      api.setActiveChain('evm');
    }
  }, [address, appkitAcc?.address, isConnected, chainId]);

  // -------------------------------------------------------
  // Context value
  // -------------------------------------------------------
  const value = useMemo<CtxType>(
    () => ({
      // Base ChainProvider
      connect,
      disconnect: disconnectWallet,
      getBalance: async () => '0',
      getAccountInfo: async () => ({
        address: (address ?? appkitAcc?.address ?? '') as string,
        balance: '0',
        nativeBalance: '0',
      }),
      sendTransaction,
      estimateTransactionFee: async () => '0',
      onAccountChange: undefined,
      onNetworkChange: undefined,
      onDisconnect: undefined,

      // EvmChainProvider extras
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
      address: (address ?? appkitAcc?.address ?? null) as string | null,
      isConnected: !!(isConnected || appkitAcc?.address),
    }),
    [
      connect,
      disconnectWallet,
      address,
      appkitAcc?.address,
      isConnected,
      sendTransaction,
      switchChain,
      chainId,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};






