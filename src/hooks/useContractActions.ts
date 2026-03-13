/**
 * useContractActions — orchestrates blockchain actions across EVM, Solana, Stellar.
 *
 * CHANGED in wallet layer consolidation (Step 3):
 * - Now accepts `chainConfig: ChainConfig` as a required parameter
 * - No longer calls useQuizChainIntegration internally
 * - No longer imports setDeploymentInProgress (auto-switch is gone)
 * - Chain family is derived from chainConfig via useChainWallet
 *
 * The deploy/join/distribute logic itself is unchanged.
 */

import { useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useChainWallet } from './useChainWallet';
import type { ChainConfig } from '../types/chainConfig';
import type { SupportedChain } from '../chains/types';

/* ------------------------- EVM hooks ------------------------- */
import { useEvmJoin } from '../chains/evm/hooks/useEvmJoin';
import { useEvmDeploy } from '../chains/evm/hooks/useEvmDeploy';
import { useEvmDistributePrizes } from '../chains/evm/hooks/useEvmDistributePrizes';

/* ------------------------- Solana hooks ------------------------- */
import { useSolanaCreatePoolRoom } from '../chains/solana/hooks/useSolanaCreatePoolRoom';
import { useSolanaCreateAssetRoom } from '../chains/solana/hooks/useSolanaCreateAssetRoom';
import { useSolanaJoinRoom } from '../chains/solana/hooks/useSolanaJoinRoom';
import { useSolanaEndRoom } from '../chains/solana/hooks/useSolanaEndRoom';

import type { SolanaTokenCode } from '../chains/solana/config/solanaTokenConfig';
import type { Prize } from '../components/Quiz/types/quiz';

/** ---------- Types ---------- */
export type DeployParams = {
  roomId: string;
  hostId: string;
  currency?: string;
  entryFee?: string | number;
  hostFeePct?: number;
  prizeMode?: 'split' | 'assets';
  charityName?: string;
  charityAddress?: string;
  prizePoolPct?: number;
  prizeSplits?: { first: number; second?: number; third?: number };
  expectedPrizes?: Prize[];
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
  roomId: string;
  extrasAmount?: string;
  feeAmount?: any;
  roomAddress?: any;
  currency?: string;
};

type JoinResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type DistributeArgs = {
  roomId: string;
  roomAddress?: string;
  prizeMode?: 'assets' | 'split' | 'pool';
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
    amount?: string;
  }>;
  charityOrgId?: string;
  charityName?: string;
  charityAddress?: string;
  web3Chain?: string;
  evmNetwork?: string;
  charityWallet?: string;
  charityAmountPreview?: string;
  charityCurrency?: string;
};

type DistributeResult =
  | {
      success: true;
      txHash: string;
      explorerUrl?: string;
      cleanupTxHash?: string;
      rentReclaimed?: number;
      error?: string;
      charityAmount?: string;
      tgbDepositAddress?: string;
      declareWinnersTxHash?: string;
      tgbDepositMemo?: string;
      tbgDepositAddress?: string;
    }
  | { success: false; error: string };

/* ---------------- Main hook ---------------- */
export function useContractActions(chainConfig: ChainConfig) {
  // chainFamily comes from the config parameter — no store reads
  const { chainFamily } = useChainWallet(chainConfig);
  const effectiveChain = chainFamily as SupportedChain | null;

  // EVM hooks
  const { joinRoom: evmJoinRoom } = useEvmJoin();
  const { deploy: evmDeploy } = useEvmDeploy();
  const { distributePrizes: evmDistributePrizes } = useEvmDistributePrizes();

  // Solana hooks
  const { createPoolRoom: solanaCreatePoolRoom } = useSolanaCreatePoolRoom();
  const { createAssetRoom: solanaCreateAssetRoom } = useSolanaCreateAssetRoom();
  const { joinRoom: solanaJoinRoom } = useSolanaJoinRoom();
  const { endRoom: solanaEndRoom } = useSolanaEndRoom();

  /** ---------------- JOIN ROOM ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async (_args: JoinArgs): Promise<JoinResult> => ({
        success: false,
        error: 'Stellar join must be handled through StellarLaunchSection component',
      });
    }

    if (effectiveChain === 'evm') {
      return evmJoinRoom;
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId, feeAmount, extrasAmount, roomAddress, currency }: JoinArgs): Promise<JoinResult> => {
        console.log('[useContractActions][joinRoom] 🎮 Solana join room', { roomId, feeAmount, extrasAmount, roomAddress, currency });

        try {
          if (!roomAddress) {
            return { success: false, error: 'Room address required for Solana join.' };
          }

          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string' ? new PublicKey(roomAddress) : roomAddress;
          } catch (e: any) {
            return { success: false, error: `Invalid room address: ${e.message}` };
          }

          const entryFeeNum = feeAmount ? parseFloat(String(feeAmount)) : undefined;
          const extrasNum = extrasAmount ? parseFloat(String(extrasAmount)) : 0;
          const currencyCode = (currency ?? 'USDG').toUpperCase() as SolanaTokenCode;

          const result = await solanaJoinRoom({
            roomId,
            roomAddress: roomPDA,
            entryFee: entryFeeNum,
            extrasAmount: extrasNum,
            currency: currencyCode,
          });

          return { success: true, txHash: result.txHash };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to join Solana room' };
        }
      };
    }

    return async (_args: JoinArgs): Promise<JoinResult> => ({
      success: false,
      error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, evmJoinRoom, solanaJoinRoom]);

  /** ---------------- DISTRIBUTE PRIZES ---------------- */
  const distributePrizes = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async (): Promise<DistributeResult> => ({
        success: false,
        error: 'Stellar prize distribution must be handled through StellarLaunchSection component',
      });
    }

    if (effectiveChain === 'evm') {
      return evmDistributePrizes;
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId, winners, roomAddress, charityOrgId, charityAddress }: DistributeArgs): Promise<DistributeResult> => {
        console.log('[useContractActions][distributePrizes] 🏆 Solana', { roomId, winnersCount: winners.length });

        try {
          if (!roomAddress) return { success: false, error: 'Missing room address for distribution' };

          const winnerAddresses = winners.map((w) => w.address).filter((a): a is string => !!a);
          if (winnerAddresses.length === 0) return { success: false, error: 'No valid winner addresses' };

          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string' ? new PublicKey(roomAddress) : roomAddress;
          } catch (e: any) {
            return { success: false, error: `Invalid room address: ${e.message}` };
          }

          const winnerPublicKeys: PublicKey[] = [];
          for (const addr of winnerAddresses) {
            try {
              winnerPublicKeys.push(new PublicKey(addr));
            } catch (e: any) {
              return { success: false, error: `Invalid winner address: ${addr}` };
            }
          }

          let charityWalletPubkey: PublicKey | undefined;
          if (charityAddress) {
            try { charityWalletPubkey = new PublicKey(charityAddress); } catch {}
          }

          const result = await solanaEndRoom({
            roomId,
            roomAddress: roomPDA,
            winners: winnerPublicKeys,
            charityOrgId: charityOrgId ?? undefined,
            charityWallet: charityWalletPubkey,
          });

          const declareWinnersTxHash = 'declareWinnersTxHash' in result ? result.declareWinnersTxHash : undefined;

          return {
            success: true,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
            charityAmount: result.charityAmount,
            tgbDepositAddress: result.tgbDepositAddress,
            declareWinnersTxHash,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Solana prize distribution failed' };
        }
      };
    }

    return async (): Promise<DistributeResult> => ({
      success: false,
      error: 'Prize distribution not implemented for this chain',
    });
  }, [effectiveChain, evmDistributePrizes, solanaEndRoom]);

  /** ---------------- DEPLOY ---------------- */
  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      console.log('[useContractActions][deploy] 🚀 chain:', effectiveChain, 'params:', params);

      // Note: no setDeploymentInProgress here — the auto-switch useEffect is gone.
      // useEvmJoin still uses its own local lock during the approve+join sequence,
      // which is fine because that's purely within a single async function, not a
      // module-level flag fighting across hook instances.

      if (effectiveChain === 'stellar') {
        throw new Error('Stellar deployment must be handled through StellarLaunchSection component');
      }

      if (effectiveChain === 'evm') {
        return evmDeploy(params);
      }

      if (effectiveChain === 'solana') {
        const currency = (params.currency ?? 'USDG').toUpperCase() as SolanaTokenCode;

        if (params.prizeMode === 'assets') {
          if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
            throw new Error('Asset room requires at least one prize');
          }
          const result = await solanaCreateAssetRoom({
            roomId: params.roomId,
            currency,
            entryFee: parseFloat(String(params.entryFee ?? '1.0')),
            maxPlayers: 100,
            hostFeePct: params.hostFeePct ?? 0,
            charityName: params.charityName,
            expectedPrizes: params.expectedPrizes,
          });
          return {
            success: true,
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          };
        } else {
          const result = await solanaCreatePoolRoom({
            roomId: params.roomId,
            currency,
            entryFee: parseFloat(String(params.entryFee ?? '1.0')),
            maxPlayers: 100,
            hostFeePct: params.hostFeePct ?? 0,
            prizePoolPct: params.prizePoolPct ?? 0,
            charityName: params.charityName,
            prizeSplits: params.prizeSplits,
          });
          return {
            success: true,
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          };
        }
      }

      throw new Error(`Deployment not implemented for ${effectiveChain} chain`);
    },
    [effectiveChain, evmDeploy, solanaCreatePoolRoom, solanaCreateAssetRoom]
  );

  return { deploy, joinRoom, distributePrizes };
}