// src/hooks/useContractActions.ts
import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';

import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
import { useQuizContract as useStellarQuizContract } from '../chains/stellar/useQuizContract';

import type { SupportedChain } from '../chains/types';

/** ---------- Types ---------- */
export type DeployParams = {
  roomId: string;
  hostId: string;
  currency?: string;
  entryFee?: string | number;
  hostFeePct?: number;

  prizeMode?: 'split' | 'assets';
  charityName?: string;

  // split / pool mode
  prizePoolPct?: number;
  prizeSplits?: { first: number; second?: number; third?: number };

  // asset mode
  expectedPrizes?: Array<{ tokenAddress: string; amount: string }>;

  // meta
  hostWallet: string;
  hostMetadata?: {
    hostName?: string;
    eventDateTime?: string;
    totalRounds?: number;
  };
};

export type DeployResult = {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
};

type JoinArgs = {
  /** Room being joined */
  roomId: string;
  /** Optional extras total (display units / string) */
  extrasAmount?: string;
};

type JoinResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type DistributeArgs = {
  roomId: string;
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
    amount?: string;
  }>;
};

type DistributeResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type Options = { chainOverride?: SupportedChain | null };

/** ---------- Safe stubs when provider isn’t mounted ---------- */
const STELLAR_WALLET_STUB = {
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  address: null as string | null,
  networkPassphrase: undefined as string | undefined,
};

const STELLAR_CTX_STUB = {
  wallet: STELLAR_WALLET_STUB,
  currentNetwork: 'public' as 'public' | 'testnet',
  connect: async () => ({
    success: false as const,
    address: null,
    error: {
      code: 'NO_PROVIDER' as any,
      message: 'Stellar wallet provider not mounted',
      timestamp: new Date(),
    },
  }),
  disconnect: async () => {},
  formatAddress: (addr?: string | null) =>
    !addr ? '' : addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr,
};

/** ---------- Hook ---------- */
export function useContractActions(opts?: Options) {
  // Room-driven override takes priority over store
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Try to read Stellar contexts; fall back to stubs if not mounted
  let stellarCtx = STELLAR_CTX_STUB;
  try {
    stellarCtx = useStellarWalletContext() as typeof STELLAR_CTX_STUB;
  } catch {
    // keep stub
  }

  let stellarContract: ReturnType<typeof useStellarQuizContract> | null = null;
  try {
    stellarContract = useStellarQuizContract() as any;
  } catch {
    stellarContract = null;
  }

  /** Resolve host/player address for current chain */
  const getHostAddress = useCallback(
    (fallback: string) => {
      switch (effectiveChain) {
        case 'stellar':
          return stellarCtx.wallet.address ?? '';
        // case 'evm': return evmCtx.address ?? '';
        // case 'solana': return solanaCtx.address ?? '';
        default:
          return fallback;
      }
    },
    [effectiveChain, stellarCtx.wallet.address]
  );

  /** ---------------- Player: joinRoom ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async ({ roomId, extrasAmount }: JoinArgs): Promise<JoinResult> => {
        if (!stellarContract?.joinRoom) {
          return { success: false, error: 'Stellar contract not ready' };
        }
        // Wallet/contract guards (narrow to string)
        const playerAddressMaybe =
          (stellarContract as any).walletAddress as string | undefined;
        if (!playerAddressMaybe || playerAddressMaybe.length === 0) {
          return { success: false, error: 'Stellar wallet not connected' };
        }
        const playerAddress: string = playerAddressMaybe;

        const res = await stellarContract.joinRoom({
          roomId,
          playerAddress,
          extrasAmount, // optional
        });

        if (!res?.success) {
          return { success: false, error: res?.error || 'Payment failed' };
        }

        // Normalize transaction hash
        const txHashRaw =
          (res as any).txHash ??
          (res as any).transactionHash ??
          (res as any).hash;

        if (typeof txHashRaw !== 'string' || txHashRaw.length === 0) {
          return { success: false, error: 'Payment succeeded but no transaction hash was returned' };
        }

        const txHash: string = txHashRaw;
        return { success: true, txHash };
      };
    }

    // TODO: implement EVM/Solana join
    return async (_args: JoinArgs): Promise<JoinResult> => ({
      success: false,
      error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, stellarContract]);

  /** ---------------- Host: prize distribution (NEW) ---------------- */
  const distributePrizes = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async ({ roomId, winners }: DistributeArgs): Promise<DistributeResult> => {
        if (!stellarContract) return { success: false, error: 'Stellar contract not ready' };

      
             // Soroban contract expects a simple array of addresses (string[])
      // Convert our generic winners payload -> string[]
       const addrList = winners.map(w => {
         if (!w.address || typeof w.address !== 'string' || w.address.length === 0) {
           throw new Error(`Missing or invalid address for winner ${w.playerId ?? '(unknown)'}`);
         }
         return w.address;
       });

       // Call the concrete method with the addresses array
       // (Your previous working flow called endRoom({ roomId, winners: string[] }))
       const res =
         await (stellarContract as any).endRoom?.({ roomId, winners: addrList }) ??
         await (stellarContract as any).distributePrizes?.({ roomId, winners: addrList })

        if (!res?.success) return { success: false, error: res?.error || 'Distribution failed' };

        const txHashRaw =
          (res as any).txHash ??
          (res as any).transactionHash ??
          (res as any).hash;

        if (typeof txHashRaw !== 'string' || txHashRaw.length === 0) {
          return { success: false, error: 'No transaction hash returned' };
        }

        return { success: true, txHash: txHashRaw };
      };
    }

    // TODO: implement EVM/Solana
    return async (_: DistributeArgs): Promise<DistributeResult> => ({
      success: false,
      error: `Prize distribution not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, stellarContract]);

  /** ---------------- Host: deploy (existing) ---------------- */
  const createPoolRoom = useCallback(
    async (p: {
      roomId: string;
      currency: string;
      entryFee: string | number;
      hostFeePct: number;
      prizePoolPct: number;
      charityName?: string;
      prizeSplits: { first: number; second?: number; third?: number };
      hostAddress: string;
    }): Promise<DeployResult> => {
      switch (effectiveChain) {
        case 'stellar': {
          if (!stellarContract) throw new Error('Stellar contract not ready');
          const res = await stellarContract.createPoolRoom({
            roomId: p.roomId,
            hostAddress: p.hostAddress,
            currency: p.currency || 'XLM',
            entryFee: String(p.entryFee ?? '1.0'),
            hostFeePct: p.hostFeePct ?? 0,
            prizePoolPct: p.prizePoolPct ?? 0,
            charityName: p.charityName,
            prizeSplits: p.prizeSplits ?? { first: 100 },
          });
          if (!res?.success) throw new Error('Stellar createPoolRoom failed');
          return {
            success: true,
            contractAddress: res.contractAddress,
            txHash: res.txHash,
            explorerUrl: (res as any).explorerUrl,
          };
        }
        case 'evm': {
          // TODO: replace with real EVM client
          return {
            success: true,
            contractAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
            txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          };
        }
        case 'solana': {
          // TODO: replace with real Solana client
          return {
            success: true,
            contractAddress: `SOLANA_PROGRAM_${p.roomId}`,
            txHash: `solana_sig_${Math.random().toString(36).slice(2, 16)}`,
          };
        }
        default:
          throw new Error('No chain selected');
      }
    },
    [effectiveChain, stellarContract]
  );

  const createAssetRoom = useCallback(
    async (p: {
      roomId: string;
      currency: string;
      entryFee: string | number;
      hostFeePct: number;
      charityName?: string;
      expectedPrizes: Array<{ tokenAddress: string; amount: string }>;
      hostAddress: string;
    }): Promise<DeployResult> => {
      switch (effectiveChain) {
        case 'stellar': {
          if (!stellarContract) throw new Error('Stellar contract not ready');
          const res = await stellarContract.createAssetRoom({
            roomId: p.roomId,
            hostAddress: p.hostAddress,
            currency: p.currency || 'XLM',
            entryFee: String(p.entryFee ?? '1.0'),
            hostFeePct: p.hostFeePct ?? 0,
            charityName: p.charityName,
            expectedPrizes: p.expectedPrizes ?? [],
          });
          if (!res?.success) throw new Error('Stellar createAssetRoom failed');
          return {
            success: true,
            contractAddress: res.contractAddress,
            txHash: res.txHash,
            explorerUrl: (res as any).explorerUrl,
          };
        }
        case 'evm': {
          // TODO: replace with real EVM client
          return {
            success: true,
            contractAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
            txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          };
        }
        case 'solana': {
          // TODO: replace with real Solana client
          return {
            success: true,
            contractAddress: `SOLANA_PROGRAM_${p.roomId}`,
            txHash: `solana_sig_${Math.random().toString(36).slice(2, 16)}`,
          };
        }
        default:
          throw new Error('No chain selected');
      }
    },
    [effectiveChain, stellarContract]
  );

  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      const hostAddress = getHostAddress(params.hostWallet);

      // Normalize required fields so types are exact (no undefined)
      const currency: string = params.currency ?? 'XLM';
      const entryFee: string | number = params.entryFee ?? '1.0';
      const hostFeePct: number = params.hostFeePct ?? 0;
      const charityName: string | undefined = params.charityName;

      if (params.prizeMode === 'assets') {
        if (!params.expectedPrizes?.length) {
          throw new Error('expectedPrizes required for asset-based room');
        }
        return createAssetRoom({
          roomId: params.roomId,
          currency,
          entryFee,
          hostFeePct,
          charityName,
          expectedPrizes: params.expectedPrizes,
          hostAddress,
        });
      }

      // default → split/pool mode
      const prizeSplits = params.prizeSplits ?? { first: 100 };
      const prizePoolPct = params.prizePoolPct ?? 0;

      return createPoolRoom({
        roomId: params.roomId,
        currency,
        entryFee,
        hostFeePct,
        prizePoolPct,
        charityName,
        prizeSplits,
        hostAddress,
      });
    },
    [getHostAddress, createAssetRoom, createPoolRoom]
  );

  // 👇 IMPORTANT: include distributePrizes in the returned object
  return { deploy, joinRoom, distributePrizes };
}

// Optional: export a typed alias if you want to reuse the shape elsewhere
export type ContractActions = ReturnType<typeof useContractActions>;







