/**
 * useContractActions — orchestrates blockchain actions across EVM, Solana, Stellar.
 *
 * ## Solana changes (new contract)
 *
 * deploy() Solana path:
 * - Asset room branch REMOVED (init_asset_room is gone from new contract)
 * - solanaCreatePoolRoom now only receives: roomId, currency, entryFee
 *   All fee splits are fixed on-chain — hostFeePct, prizePoolPct,
 *   charityName, prizeSplits are no longer passed.
 *
 * distributePrizes() Solana path:
 * - Unchanged — solanaEndRoom signature is the same.
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
import { useSolanaJoinRoom } from '../chains/solana/hooks/useSolanaJoinRoom';
import { useSolanaEndRoom } from '../chains/solana/hooks/useSolanaEndRoom';

import type { SolanaTokenCode } from '../chains/solana/config/solanaTokenConfig';
import type { Prize } from '../components/Quiz/types/quiz';

/** ---------- Types ---------- */
export type DeployParams = {
  roomId:      string;
  hostId:      string;
  currency?:   string;
  entryFee?:   string | number;
  // EVM-only fields (ignored for Solana)
  hostFeePct?:   number;
  prizeMode?:    'split' | 'assets';
  charityName?:  string;
  charityAddress?: string;
  prizePoolPct?: number;
  prizeSplits?:  { first: number; second?: number; third?: number };
  expectedPrizes?: Prize[];
  hostWallet:  string;
  hostMetadata?: {
    hostName?:      string;
    eventDateTime?: string;
    totalRounds?:   number;
  };
};

export type DeployResult = {
  success:          true;
  contractAddress:  string;
  txHash:           string;
  explorerUrl?:     string;
};

type JoinArgs = {
  roomId:        string;
  extrasAmount?: string;
  feeAmount?:    any;
  roomAddress?:  any;
  currency?:     string;
};

type JoinResult =
  | { success: true;  txHash: string }
  | { success: false; error:  string };

type DistributeArgs = {
  roomId:               string;
  roomAddress?:         string;
  prizeMode?:           'assets' | 'split' | 'pool';
  winners: Array<{
    playerId:  string;
    address?:  string | null;
    rank?:     number;
    amount?:   string;
  }>;
  charityOrgId?:         string;
  charityName?:          string;
  charityAddress?:       string;
  web3Chain?:            string;
  evmNetwork?:           string;
  charityWallet?:        string;
  charityAmountPreview?: string;
  charityCurrency?:      string;
  /** All players who joined — needed to build remainingAccounts for end_room */
  allPlayers?:           string[];
};

type DistributeResult =
  | {
      success:               true;
      txHash:                string;
      explorerUrl?:          string;
      cleanupTxHash?:        string;
      rentReclaimed?:        number;
      error?:                string;
      charityAmount?:        string;
      tgbDepositAddress?:    string;
      declareWinnersTxHash?: string;
      tgbDepositMemo?:       string;
      tbgDepositAddress?:    string;
    }
  | { success: false; error: string };

/* ---------------- Main hook ---------------- */
export function useContractActions(chainConfig: ChainConfig) {
  const { chainFamily } = useChainWallet(chainConfig);
  const effectiveChain = chainFamily as SupportedChain | null;

  // EVM hooks
  const { joinRoom: evmJoinRoom }           = useEvmJoin();
  const { deploy: evmDeploy }               = useEvmDeploy();
  const { distributePrizes: evmDistribute } = useEvmDistributePrizes();

  // Solana hooks
  const { createPoolRoom: solanaCreatePoolRoom } = useSolanaCreatePoolRoom();
  const { joinRoom: solanaJoinRoom }             = useSolanaJoinRoom();
  const { endRoom: solanaEndRoom }               = useSolanaEndRoom();

  /** ---------------- JOIN ROOM ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async (_args: JoinArgs): Promise<JoinResult> => ({
        success: false,
        error: 'Stellar join must be handled through StellarLaunchSection component',
      });
    }

    if (effectiveChain === 'evm') return evmJoinRoom;

    if (effectiveChain === 'solana') {
      return async ({ roomId, feeAmount, extrasAmount, roomAddress, currency }: JoinArgs): Promise<JoinResult> => {
        console.log('[useContractActions][joinRoom] Solana', { roomId, feeAmount, extrasAmount, roomAddress });

        try {
          if (!roomAddress) return { success: false, error: 'Room address required for Solana join.' };

          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string' ? new PublicKey(roomAddress) : roomAddress;
          } catch (e: any) {
            return { success: false, error: `Invalid room address: ${e.message}` };
          }

          const result = await solanaJoinRoom({
            roomId,
            roomAddress:   roomPDA,
            entryFee:      feeAmount ? parseFloat(String(feeAmount)) : undefined,
            extrasAmount:  extrasAmount ? parseFloat(String(extrasAmount)) : 0,
            currency:      ((currency ?? 'USDG').toUpperCase()) as SolanaTokenCode,
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

    if (effectiveChain === 'evm') return evmDistribute;

    if (effectiveChain === 'solana') {
      return async ({
        roomId,
        winners,
        roomAddress,
        charityOrgId,
        charityAddress,
        allPlayers,
      }: DistributeArgs): Promise<DistributeResult> => {
        console.log('[useContractActions][distributePrizes] Solana', { roomId, winnersCount: winners.length });

        try {
          if (!roomAddress) return { success: false, error: 'Missing room address for distribution' };

          const winnerAddresses = winners
            .map((w) => w.address)
            .filter((a): a is string => !!a);

          if (winnerAddresses.length === 0) {
            return { success: false, error: 'No valid winner addresses' };
          }

          let roomPDA: PublicKey;
          try {
            roomPDA = typeof roomAddress === 'string' ? new PublicKey(roomAddress) : roomAddress;
          } catch (e: any) {
            return { success: false, error: `Invalid room address: ${e.message}` };
          }

          const winnerPublicKeys: PublicKey[] = [];
          for (const addr of winnerAddresses) {
            try { winnerPublicKeys.push(new PublicKey(addr)); }
            catch (e: any) { return { success: false, error: `Invalid winner address: ${addr}` }; }
          }

          let charityWalletPubkey: PublicKey | undefined;
          if (charityAddress) {
            try { charityWalletPubkey = new PublicKey(charityAddress); } catch {}
          }

          // allPlayers: needed to build correct remainingAccounts for end_room.
          // IDL error 6019 fires if the count doesn't match room.player_count.
          const allPlayerPubkeys = allPlayers?.map((w) => new PublicKey(w));

          const result = await solanaEndRoom({
            roomId,
            roomAddress:  roomPDA,
            winners:      winnerPublicKeys,
            charityOrgId: charityOrgId ?? undefined,
            charityWallet: charityWalletPubkey,
            allPlayers:   allPlayerPubkeys,
          } as any);

          const declareWinnersTxHash =
            'declareWinnersTxHash' in result ? result.declareWinnersTxHash : undefined;

          return {
            success:              true,
            txHash:               result.txHash,
            explorerUrl:          result.explorerUrl,
            charityAmount:        result.charityAmount,
            tgbDepositAddress:    result.tgbDepositAddress,
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
  }, [effectiveChain, evmDistribute, solanaEndRoom]);

  /** ---------------- DEPLOY ---------------- */
  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      console.log('[useContractActions][deploy] chain:', effectiveChain, 'roomId:', params.roomId);

      if (effectiveChain === 'stellar') {
        throw new Error('Stellar deployment must be handled through StellarLaunchSection component');
      }

      if (effectiveChain === 'evm') {
        return evmDeploy(params);
      }

      if (effectiveChain === 'solana') {
        // New contract: only roomId, currency, entryFee are needed.
        // hostFeePct, prizePoolPct, charityName, prizeSplits, prizeMode,
        // and expectedPrizes are all FIXED or GONE — do not pass them.
        const currency = ((params.currency ?? 'USDG').toUpperCase()) as SolanaTokenCode;

        const result = await solanaCreatePoolRoom({
          roomId:   params.roomId,
          currency,
          entryFee: parseFloat(String(params.entryFee ?? '1.0')),
          // maxPlayers kept as a UI concept but not sent to contract
          maxPlayers: 100,
        });

        return {
          success:         true,
          contractAddress: result.contractAddress,
          txHash:          result.txHash,
          explorerUrl:     result.explorerUrl,
        };
      }

      throw new Error(`Deployment not implemented for ${effectiveChain} chain`);
    },
    [effectiveChain, evmDeploy, solanaCreatePoolRoom]
  );

  return { deploy, joinRoom, distributePrizes };
}