/**
 * Multi-Chain Contract Actions Hook
 * Orchestrates blockchain actions across EVM, Solana, and Stellar
 */

import { useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import type { SupportedChain } from '../chains/types';

/* ------------------------- EVM hooks ------------------------- */
import { useEvmJoin } from '../chains/evm/hooks/useEvmJoin';
import { useEvmDeploy } from '../chains/evm/hooks/useEvmDeploy';
import { useEvmDistributePrizes } from '../chains/evm/hooks/useEvmDistributePrizes';
import { setDeploymentInProgress } from './useWalletActions';

/* ------------------------- Solana hooks ------------------------- */
import { useSolanaCreatePoolRoom } from '../chains/solana/hooks/useSolanaCreatePoolRoom';
import { useSolanaCreateAssetRoom } from '../chains/solana/hooks/useSolanaCreateAssetRoom';
import { useSolanaJoinRoom } from '../chains/solana/hooks/useSolanaJoinRoom';
import { useSolanaEndRoom } from '../chains/solana/hooks/useSolanaEndRoom';

// ✅ FIXED: correct type name is SolanaTokenCode, not SolanaTokenSymbol
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
      explorerUrl?: string | undefined;
      cleanupTxHash?: string | undefined;
      rentReclaimed?: number | undefined;
      error?: string | undefined;
      charityAmount?: string | undefined;
      tgbDepositAddress?: string | undefined;
      declareWinnersTxHash?: string | undefined;
      tgbDepositMemo?: string | undefined;
      tbgDepositAddress?: string | undefined;
    }
  | { success: false; error: string };

type Options = { chainOverride?: SupportedChain | null };

/* ---------------- Main hook ---------------- */
export function useContractActions(opts?: Options) {
  const { selectedChain } = useQuizChainIntegration({
    chainOverride: opts?.chainOverride ?? null,
  });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // EVM hooks
  const { joinRoom: evmJoinRoom } = useEvmJoin();
  const { deploy: evmDeploy } = useEvmDeploy();
  const { distributePrizes: evmDistributePrizes } = useEvmDistributePrizes();

  // Solana hooks
  const { createPoolRoom: solanaCreatePoolRoom } = useSolanaCreatePoolRoom();
  const { createAssetRoom: solanaCreateAssetRoom } = useSolanaCreateAssetRoom();
  const { joinRoom: solanaJoinRoom } = useSolanaJoinRoom();
  const { endRoom: solanaEndRoom } = useSolanaEndRoom();

  // ✅ FIXED: removed misplaced currencySymbol line that was here referencing
  // an undefined 'currency' variable. Currency is resolved inside each function below.

  /** ---------------- JOIN ROOM ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async (_args: JoinArgs): Promise<JoinResult> => {
        return {
          success: false,
          error: 'Stellar join must be handled through StellarLaunchSection component',
        };
      };
    }

    if (effectiveChain === 'evm') {
      return evmJoinRoom;
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId, feeAmount, extrasAmount, roomAddress, currency }: JoinArgs): Promise<JoinResult> => {
        console.log('[useContractActions][joinRoom] 🎮 Solana join room');
        console.log('[useContractActions][joinRoom] Params:', { roomId, feeAmount, extrasAmount, roomAddress, currency });

        try {
          if (!roomAddress) {
            console.error('[useContractActions][joinRoom] ❌ Missing room address');
            return {
              success: false,
              error: 'Room address required for Solana join. Please provide the room PDA.',
            };
          }

          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string'
              ? new PublicKey(roomAddress)
              : roomAddress;
            console.log('[useContractActions][joinRoom] 📍 Room PDA:', roomPDA.toBase58());
          } catch (e: any) {
            console.error('[useContractActions][joinRoom] ❌ Invalid room address:', e);
            return { success: false, error: `Invalid room address: ${e.message}` };
          }

          const entryFeeNum = feeAmount ? parseFloat(String(feeAmount)) : undefined;
          const extrasNum = extrasAmount ? parseFloat(String(extrasAmount)) : 0;

          // ✅ UPDATED: default to USDG, typed as SolanaTokenCode
          const currencyCode = (currency ?? 'USDG').toUpperCase() as SolanaTokenCode;

          console.log('[useContractActions][joinRoom] 💵 Payment:', {
            entryFee: entryFeeNum,
            extras: extrasNum,
            currency: currencyCode,
          });

          const result = await solanaJoinRoom({
            roomId,
            roomAddress: roomPDA,
            entryFee: entryFeeNum,
            extrasAmount: extrasNum,
            currency: currencyCode,
          });

          console.log('[useContractActions][joinRoom] ✅ Join successful:', result);

          return { success: true, txHash: result.txHash };
        } catch (e: any) {
          console.error('[useContractActions][joinRoom] ❌ Solana join error:', e);
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
      return async (): Promise<DistributeResult> => {
        return {
          success: false,
          error: 'Stellar prize distribution must be handled through StellarLaunchSection component',
        };
      };
    }

    if (effectiveChain === 'evm') {
      return evmDistributePrizes;
    }

    if (effectiveChain === 'solana') {
      return async ({
        roomId,
        winners,
        roomAddress,
        charityOrgId,
        charityAddress,
      }: DistributeArgs): Promise<DistributeResult> => {
        console.log('[useContractActions][distributePrizes] 🏆 Solana prize distribution');
        console.log('[useContractActions][distributePrizes] Params:', {
          roomId,
          winnersCount: winners.length,
          roomAddress,
          charityOrgId,
        });

        try {
          if (!roomAddress) {
            console.error('[useContractActions][distributePrizes] ❌ Missing room address');
            return { success: false, error: 'Missing room address for distribution' };
          }

          const winnerAddresses = winners
            .map((w) => w.address)
            .filter((addr): addr is string => !!addr);

          if (winnerAddresses.length === 0) {
            console.error('[useContractActions][distributePrizes] ❌ No valid winner addresses');
            return { success: false, error: 'No valid winner addresses' };
          }

          console.log('[useContractActions][distributePrizes] 🏅 Winners:', winnerAddresses);

          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string'
              ? new PublicKey(roomAddress)
              : roomAddress;
          } catch (e: any) {
            console.error('[useContractActions][distributePrizes] ❌ Invalid room address:', e);
            return { success: false, error: `Invalid room address: ${e.message}` };
          }

          const winnerPublicKeys: PublicKey[] = [];
          for (const addr of winnerAddresses) {
            try {
              winnerPublicKeys.push(new PublicKey(addr));
            } catch (e: any) {
              console.error('[useContractActions][distributePrizes] ❌ Invalid winner address:', addr);
              return { success: false, error: `Invalid winner address: ${addr}` };
            }
          }

          let charityWalletPubkey: PublicKey | undefined;
          if (charityAddress) {
            try {
              charityWalletPubkey = new PublicKey(charityAddress);
              console.log('[useContractActions][distributePrizes] 📍 Fallback charity wallet:', charityWalletPubkey.toBase58());
            } catch (e: any) {
              console.warn('[useContractActions][distributePrizes] ⚠️ Invalid charity address, will use TGB only:', e);
            }
          }

          console.log('[useContractActions][distributePrizes] 🚀 Calling useSolanaEndRoom...');

          const result = await solanaEndRoom({
            roomId,
            roomAddress: roomPDA,
            winners: winnerPublicKeys,
            charityOrgId: charityOrgId ?? undefined,
            charityWallet: charityWalletPubkey,
          });

          console.log('[useContractActions][distributePrizes] ✅ Prize distribution successful:', result);

          const declareWinnersTxHash = 'declareWinnersTxHash' in result
            ? result.declareWinnersTxHash
            : undefined;

          if (declareWinnersTxHash) {
            console.log('[useContractActions][distributePrizes] 📝 Declare winners tx:', declareWinnersTxHash);
          }

          return {
            success: true,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
            charityAmount: result.charityAmount,
            tgbDepositAddress: result.tgbDepositAddress,
            declareWinnersTxHash,
          };
        } catch (e: any) {
          console.error('[useContractActions][distributePrizes] ❌ Solana distribution error:', e);
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
    console.log('[useContractActions][deploy] 🚀 Starting deployment');
    console.log('[useContractActions][deploy] Effective chain:', effectiveChain);
    console.log('[useContractActions][deploy] Params:', params);

    // 🔥 Raise the flag — prevents auto-switch from firing mid-deployment
    setDeploymentInProgress(true);

    try {
      if (effectiveChain === 'stellar') {
        throw new Error('Stellar deployment must be handled through StellarLaunchSection component');
      }

      if (effectiveChain === 'evm') {
        console.log('[useContractActions][deploy] ➡️  Delegating to EVM');
        return await evmDeploy(params);
      }

      if (effectiveChain === 'solana') {
        console.log('[useContractActions][deploy] ➡️  Delegating to Solana');

        const currency = (params.currency ?? 'USDG').toUpperCase() as SolanaTokenCode;

        if (params.prizeMode === 'assets') {
          console.log('[useContractActions][deploy] Creating asset room with params:', {
            roomId: params.roomId,
            currency,
            entryFee: params.entryFee,
            hostFeePct: params.hostFeePct,
            charityName: params.charityName,
            expectedPrizes: params.expectedPrizes?.length,
          });

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

          console.log('[useContractActions][deploy] ✅ Solana asset room created:', result);

          return {
            success: true,
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          };
        } else {
          console.log('[useContractActions][deploy] Creating pool room with params:', {
            roomId: params.roomId,
            currency,
            entryFee: params.entryFee,
            hostFeePct: params.hostFeePct,
            prizePoolPct: params.prizePoolPct,
            charityName: params.charityName,
            prizeSplits: params.prizeSplits,
          });

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

          console.log('[useContractActions][deploy] ✅ Solana pool room created:', result);

          return {
            success: true,
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          };
        }
      }

      throw new Error(`Deployment not implemented for ${effectiveChain} chain`);

 } finally {
  // 🔥 Delay clearing the flag so the auto-switch effect doesn't
  // immediately fire on the re-render after a failed deployment.
  // 2 seconds is enough for React to settle without blocking UX.
  setTimeout(() => {
    setDeploymentInProgress(false);
    console.log('[useContractActions][deploy] 🏁 Deployment flag cleared');
  }, 2000);
}
  },
  [effectiveChain, evmDeploy, solanaCreatePoolRoom, solanaCreateAssetRoom]
);

  return { deploy, joinRoom, distributePrizes };
}