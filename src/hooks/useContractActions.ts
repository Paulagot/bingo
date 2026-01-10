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

/* ------------------------- Solana hooks ------------------------- */
import { useSolanaCreatePoolRoom } from '../chains/solana/hooks/useSolanaCreatePoolRoom';
import { useSolanaCreateAssetRoom } from '../chains/solana/hooks/useSolanaCreateAssetRoom';
import { useSolanaJoinRoom } from '../chains/solana/hooks/useSolanaJoinRoom';
import { useSolanaEndRoom } from '../chains/solana/hooks/useSolanaEndRoom';

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
      tgbDepositAddress?: string | undefined;  // ✅ ADD THIS
      declareWinnersTxHash?: string | undefined;
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
      // ✅ Solana join room implementation
      return async ({ roomId, feeAmount, extrasAmount, roomAddress, currency }: JoinArgs): Promise<JoinResult> => {
        console.log('[useContractActions][joinRoom] 🎮 Solana join room');
        console.log('[useContractActions][joinRoom] Params:', { roomId, feeAmount, extrasAmount, roomAddress, currency });
        
        try {
          // Validate roomAddress is provided
          if (!roomAddress) {
            console.error('[useContractActions][joinRoom] ❌ Missing room address');
            return { 
              success: false, 
              error: 'Room address required for Solana join. Please provide the room PDA.' 
            };
          }

          // Convert roomAddress to PublicKey if it's a string
          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string' 
              ? new PublicKey(roomAddress) 
              : roomAddress;
            
            console.log('[useContractActions][joinRoom] 📍 Room PDA:', roomPDA.toBase58());
          } catch (e: any) {
            console.error('[useContractActions][joinRoom] ❌ Invalid room address:', e);
            return {
              success: false,
              error: `Invalid room address: ${e.message}`
            };
          }

          // Parse amounts
          const entryFeeNum = feeAmount ? parseFloat(String(feeAmount)) : undefined;
          const extrasNum = extrasAmount ? parseFloat(String(extrasAmount)) : 0;
          const currencySymbol = (currency ?? 'USDC').toUpperCase() as 'USDC' | 'PYUSD' | 'USDT';

          console.log('[useContractActions][joinRoom] 💵 Payment:', {
            entryFee: entryFeeNum,
            extras: extrasNum,
            currency: currencySymbol,
          });

          // Call the Solana join room hook
          const result = await solanaJoinRoom({
            roomId,
            roomAddress: roomPDA,
            entryFee: entryFeeNum,
            extrasAmount: extrasNum,
            currency: currencySymbol,
          });
          
          console.log('[useContractActions][joinRoom] ✅ Join successful:', result);
          
          return {
            success: true,
            txHash: result.txHash,
          };
        } catch (e: any) {
          console.error('[useContractActions][joinRoom] ❌ Solana join error:', e);
          return { 
            success: false, 
            error: e?.message || 'Failed to join Solana room' 
          };
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
      // ✅ Solana prize distribution with two-step flow (declare_winners + end_room)
      return async ({
        roomId,
        winners,
        roomAddress,
        charityOrgId,
        charityAddress,
        charityAmountPreview,
        charityCurrency,
      }: DistributeArgs): Promise<DistributeResult> => {
        console.log('[useContractActions][distributePrizes] 🏆 Solana prize distribution');
        console.log('[useContractActions][distributePrizes] Params:', {
          roomId,
          winnersCount: winners.length,
          roomAddress,
          charityOrgId,
          charityAmountPreview,
          charityCurrency,
        });

        try {
          // Validate room address
          if (!roomAddress) {
            console.error('[useContractActions][distributePrizes] ❌ Missing room address');
            return { success: false, error: 'Missing room address for distribution' };
          }

          // Map winners to addresses
          const winnerAddresses = winners
            .map((w) => w.address)
            .filter((addr): addr is string => !!addr);

          if (winnerAddresses.length === 0) {
            console.error('[useContractActions][distributePrizes] ❌ No valid winner addresses');
            return { success: false, error: 'No valid winner addresses' };
          }

          console.log('[useContractActions][distributePrizes] 🏅 Winners:', winnerAddresses);

          // Convert roomAddress to PublicKey
          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string' 
              ? new PublicKey(roomAddress) 
              : roomAddress;
          } catch (e: any) {
            console.error('[useContractActions][distributePrizes] ❌ Invalid room address:', e);
            return {
              success: false,
              error: `Invalid room address: ${e.message}`
            };
          }

          // Convert winner addresses to PublicKeys
          const winnerPublicKeys: PublicKey[] = [];
          for (const addr of winnerAddresses) {
            try {
              winnerPublicKeys.push(new PublicKey(addr));
            } catch (e: any) {
              console.error('[useContractActions][distributePrizes] ❌ Invalid winner address:', addr);
              return {
                success: false,
                error: `Invalid winner address: ${addr}`
              };
            }
          }

          // Prepare fallback charity wallet (if provided)
          let charityWalletPubkey: PublicKey | undefined;
          if (charityAddress) {
            try {
              charityWalletPubkey = new PublicKey(charityAddress);
              console.log('[useContractActions][distributePrizes] 📍 Fallback charity wallet:', charityWalletPubkey.toBase58());
            } catch (e: any) {
              console.warn('[useContractActions][distributePrizes] ⚠️ Invalid charity address, will use TGB only:', e);
            }
          }

          // Call the Solana end room hook (two-step flow)
          console.log('[useContractActions][distributePrizes] 🚀 Calling useSolanaEndRoom...');
          
          const result = await solanaEndRoom({
            roomId,
            roomAddress: roomPDA,
            winners: winnerPublicKeys,
            charityOrgId: charityOrgId ?? undefined,
            charityWallet: charityWalletPubkey, // Can be undefined - hook will use TGB or require this
          });

          console.log('[useContractActions][distributePrizes] ✅ Prize distribution successful:', result);

          // Extract declareWinnersTxHash if present (for logging)
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
            // Pass through declareWinnersTxHash if present
            declareWinnersTxHash: declareWinnersTxHash,
          };
        } catch (e: any) {
          console.error('[useContractActions][distributePrizes] ❌ Solana distribution error:', e);
          return { 
            success: false, 
            error: e?.message || 'Solana prize distribution failed' 
          };
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

      if (effectiveChain === 'stellar') {
        throw new Error(
          'Stellar deployment must be handled through StellarLaunchSection component'
        );
      }

      if (effectiveChain === 'evm') {
        console.log('[useContractActions][deploy] ➡️  Delegating to EVM');
        return evmDeploy(params);
      }

      if (effectiveChain === 'solana') {
        console.log('[useContractActions][deploy] ➡️  Delegating to Solana');
        
        // ✅ Map DeployParams to Solana params
        const currency = (params.currency ?? 'USDC').toUpperCase() as 'USDC' | 'PYUSD' | 'USDT';
        
        if (params.prizeMode === 'assets') {
          // ✅ Asset room creation
          console.log('[useContractActions][deploy] Creating asset room with params:', {
            roomId: params.roomId,
            currency,
            entryFee: params.entryFee,
            hostFeePct: params.hostFeePct,
            charityName: params.charityName,
            expectedPrizes: params.expectedPrizes?.length,
          });

          // Validate expectedPrizes
          if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
            throw new Error('Asset room requires at least one prize');
          }

          const result = await solanaCreateAssetRoom({
            roomId: params.roomId,
            currency,
            entryFee: parseFloat(String(params.entryFee ?? '1.0')),
            maxPlayers: 100, // TODO: Make this configurable in UI
            hostFeePct: params.hostFeePct ?? 0,
            charityName: params.charityName,
            expectedPrizes: params.expectedPrizes,
          });

          console.log('[useContractActions][deploy] ✅ Solana asset room created:', result);
          console.log('[useContractActions][deploy] ⚠️  Next steps:');
          console.log('[useContractActions][deploy]   - Room status: AwaitingFunding');
          console.log('[useContractActions][deploy]   - Host must deposit', result.expectedPrizes, 'prizes');
          console.log('[useContractActions][deploy]   - Call addPrizeAsset for each prize');

          return {
            success: true,
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          };
        } else {
          // ✅ Pool room creation
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
            maxPlayers: 100, // TODO: Make this configurable in UI
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
    },
    [effectiveChain, evmDeploy, solanaCreatePoolRoom, solanaCreateAssetRoom]
  );

  return { deploy, joinRoom, distributePrizes };
}