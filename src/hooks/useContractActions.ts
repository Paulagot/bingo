// src/hooks/useContractActions.ts
import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';

import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
import { useQuizContract as useStellarQuizContract } from '../chains/stellar/useQuizContract';

import type { SupportedChain } from '../chains/types';

/* ------------------------- NEW: EVM imports (Step 4) ------------------------- */
import { writeContract, waitForTransactionReceipt, getChainId } from 'wagmi/actions';
import { config as wagmiConfig } from '../config';
import {
  resolveEvmTarget,
  explorerFor,
  isEvmAddress,
  isEvmTxHash,
} from '../chains/evm/utils/evmSelect';
import {
  POOL_FACTORY,
  PoolFactoryABI,
} from '../chains/evm/config/contracts.pool';
import {
  ASSET_FACTORY,
  AssetFactoryABI,
} from '../chains/evm/config/contracts.asset';

const DEBUG_WEB3 = true;

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
        // case 'evm': return evmAddress ?? '';
        // case 'solana': return solanaAddress ?? '';
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

  /** ---------------- Host: prize distribution (Stellar) ---------------- */
  const distributePrizes = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async ({ roomId, winners }: DistributeArgs): Promise<DistributeResult> => {
        if (!stellarContract) return { success: false, error: 'Stellar contract not ready' };

        // Soroban expects string[] of addresses
        const addrList = winners.map(w => {
          if (!w.address || typeof w.address !== 'string' || w.address.length === 0) {
            throw new Error(`Missing or invalid address for winner ${w.playerId ?? '(unknown)'}`);
          }
          return w.address;
        });

        const res =
          await (stellarContract as any).endRoom?.({ roomId, winners: addrList }) ??
          await (stellarContract as any).distributePrizes?.({ roomId, winners: addrList });

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

  /* ------------------------ NEW: Internal EVM deployer ------------------------ */
  const deployEvm = useCallback(
    async (p: DeployParams, which: 'pool' | 'asset'): Promise<DeployResult> => {
      // Resolve current chain (selected in UI or wallet)
      let runtimeChainId: number | null = null;
      try {
        runtimeChainId = await getChainId(wagmiConfig);
      } catch {
        runtimeChainId = null;
      }
      const setupKey = (JSON.parse(localStorage.getItem('setupConfig') || '{}')?.evmNetwork) as string | undefined;
      const target = resolveEvmTarget({ setupKey, runtimeChainId });
      const explorer = explorerFor(target.key);

      const isPool = which === 'pool';
      const factory =
        (isPool ? (POOL_FACTORY as any)[target.key] : (ASSET_FACTORY as any)[target.key]) as string | undefined;
      const abi = isPool ? PoolFactoryABI : AssetFactoryABI;

      if (DEBUG_WEB3) {
        console.log('[EVM][DEPLOY] target', target);
        console.log('[EVM][DEPLOY] prizeMode ->', which.toUpperCase());
        console.log('[EVM][DEPLOY] factory @', factory);
      }

      if (!factory || !/^0x[0-9a-fA-F]{40}$/.test(factory)) {
        throw new Error(`No factory configured for ${target.key} (${target.id}).`);
      }

      // Prepare args for your factory’s function
      const entryFee6 = BigInt(Math.round(parseFloat(String(p.entryFee ?? '0')) * 10 ** 6));
      const hostPct = Number(p.hostFeePct ?? 0);
      const prizesPct = Number(p.prizePoolPct ?? 0);
      const charityPct = Math.max(0, 100 - (hostPct + prizesPct)); // adjust to your business rules

      const args = isPool
        // createPoolRoom(roomId, hostId, hostWallet, entryFeeUSDC6, hostPct, prizesPct, charityPct, charityName)
        ? [p.roomId, p.hostId, p.hostWallet, entryFee6, hostPct, prizesPct, charityPct, (p.charityName ?? '')]
        // createAssetRoom(roomId, hostId, hostWallet, entryFeeUSDC6, expectedPrizes, charityName)
        : [p.roomId, p.hostId, p.hostWallet, entryFee6, (p.expectedPrizes ?? []), (p.charityName ?? '')];

      if (DEBUG_WEB3) {
        console.log('[EVM][DEPLOY] writeContract', {
          chainId: target.id,
          factory,
          functionName: isPool ? 'createPoolRoom' : 'createAssetRoom',
          argsPreview: args.slice(0, 4),
        });
      }

      const hash = await writeContract(wagmiConfig, {
        address: factory as `0x${string}`,
        abi,
        functionName: isPool ? 'createPoolRoom' : 'createAssetRoom', // set to your actual names
        args,
        chainId: target.id,
      });

      if (DEBUG_WEB3) console.log('[EVM][DEPLOY] tx submitted', hash);

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: target.id });
      if (DEBUG_WEB3) console.log('[EVM][DEPLOY] receipt', receipt);

      // Try to extract room/program address from logs (update once you have event ABI)
      let roomAddress: string | null = null;
      try {
        // TODO: decode specific RoomCreated event with viem’s decodeEventLog when you know it
        // For now fall back to the log’s address (factory emits room as a created contract address in some patterns)
        roomAddress = (receipt.logs?.[0] as any)?.address ?? null;
      } catch (e) {
        if (DEBUG_WEB3) console.warn('[EVM][DEPLOY] room address decode failed', e);
      }

      const okHash = isEvmTxHash(typeof hash === 'string' ? hash : null);
      const okRoom = isEvmAddress(roomAddress);

      if (DEBUG_WEB3) console.log('[EVM][DEPLOY] parsed', { okHash, okRoom, roomAddress, tx: hash });

      if (!okHash) throw new Error('Deployment returned invalid tx hash');
      if (!okRoom) throw new Error('Deployment succeeded but could not resolve room address (update log decoder)');

      return {
        success: true,
        contractAddress: roomAddress!,
        txHash: hash as `0x${string}`,
        explorerUrl: `${explorer}/tx/${hash}`,
      };
    },
    []
  );

  /** ---------------- Host: deploy (POOL) ---------------- */
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
          // Use the shared EVM deployer
          const result = await deployEvm(
            {
              roomId: p.roomId,
              hostId: '', // optional for factory args above; we pass p.roomId, p.hostId in deploy()
              entryFee: p.entryFee,
              hostFeePct: p.hostFeePct,
              prizePoolPct: p.prizePoolPct,
              charityName: p.charityName,
              prizeMode: 'split',
              hostWallet: p.hostAddress,
            },
            'pool'
          );
          return result;
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
    [effectiveChain, stellarContract, deployEvm]
  );

  /** ---------------- Host: deploy (ASSET) ---------------- */
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
          const result = await deployEvm(
            {
              roomId: p.roomId,
              hostId: '', // optional for factory args above
              entryFee: p.entryFee,
              hostFeePct: p.hostFeePct,
              charityName: p.charityName,
              prizeMode: 'assets',
              expectedPrizes: p.expectedPrizes,
              hostWallet: p.hostAddress,
            },
            'asset'
          );
          return result;
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
    [effectiveChain, stellarContract, deployEvm]
  );

  /** ---------------- Orchestrator: deploy ---------------- */
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

  return { deploy, joinRoom, distributePrizes };
}

// Optional: export a typed alias if you want to reuse the shape elsewhere
export type ContractActions = ReturnType<typeof useContractActions>;








