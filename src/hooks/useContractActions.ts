/**
 * Multi-Chain Contract Actions Hook
 * Orchestrates blockchain actions across EVM, Solana, and Stellar
 */

import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import { useSolanaContractContext } from '../chains/solana/useSolanaContractContext';
import type { SupportedChain } from '../chains/types';

/* ------------------------- EVM hooks ------------------------- */
import { useEvmJoin } from '../chains/evm/hooks/useEvmJoin';
import { useEvmDeploy } from '../chains/evm/hooks/useEvmDeploy';
import { useEvmDistributePrizes } from '../chains/evm/hooks/useEvmDistributePrizes';

/* ------------------------- Solana imports ------------------------- */
import { TOKEN_MINTS, PROGRAM_ID, PDA_SEEDS } from '@/shared/lib/solana/config';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

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

  // Solana context
  const solanaContractResult = useSolanaContractContext();
  const solanaContract = effectiveChain === 'solana' ? solanaContractResult : null;

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
      return async ({ roomId, feeAmount, extrasAmount, currency }: JoinArgs): Promise<JoinResult> => {
        try {
          if (!solanaContract || !solanaContract.isReady) {
            return { success: false, error: 'Solana contract not ready' };
          }
          if (!solanaContract.publicKey) {
            return { success: false, error: 'Wallet not connected' };
          }

          const curr = (currency ?? 'SOL').toUpperCase();
          const decimals = curr === 'SOL' ? 9 : 6;
          const multiplier = Math.pow(10, decimals);

          const entryFeeLamports = new BN(parseFloat(String(feeAmount ?? '0')) * multiplier);
          const extrasLamports = extrasAmount
            ? new BN(parseFloat(String(extrasAmount)) * multiplier)
            : new BN(0);

          console.log('[useContractActions] Solana joinRoom:', {
            roomId,
            feeAmount,
            currency: curr,
            decimals,
            entryFeeLamports: entryFeeLamports.toString(),
            extrasAmount,
            extrasLamports: extrasLamports.toString(),
          });

          const res = await solanaContract.joinRoom({
            roomId,
            entryFee: entryFeeLamports,
            extrasAmount: extrasLamports,
          });

          return {
            success: true,
            txHash: res.signature as `0x${string}`,
          };
        } catch (e: any) {
          console.error('[Solana joinRoom error]', e);
          return { success: false, error: e?.message || 'Solana join failed' };
        }
      };
    }

    return async (_args: JoinArgs): Promise<JoinResult> => ({
      success: false,
      error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, solanaContract, evmJoinRoom]);

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
        charityAmountPreview,
        charityCurrency,
      }: DistributeArgs): Promise<DistributeResult> => {
        try {
          if (!solanaContract || !solanaContract.isReady) {
            return { success: false, error: 'Solana contract not ready' };
          }
          if (!solanaContract.publicKey) {
            return { success: false, error: 'Wallet not connected' };
          }
          if (!roomAddress) {
            return {
              success: false,
              error: 'Missing Solana room address (PDA) for prize distribution',
            };
          }

          const winnerAddresses = winners
            .map((w) => w.address)
            .filter((addr): addr is string => !!addr);

          if (winnerAddresses.length === 0) {
            return { success: false, error: 'No valid winner addresses' };
          }

          let effectiveCharityWallet: string | null = null;

          // TGB charity flow
          if (charityOrgId) {
            try {
              console.log('====================================================');
              console.log('[Solana][TGB] Step 1: Calling previewCharityPayout...');
              console.log('[Solana][TGB] Parameters:', {
                roomId,
                roomAddress,
                charityOrgId,
                charityAmountPreview,
              });

              const preview = await solanaContract.previewCharityPayout({
                roomId,
                roomAddress: new PublicKey(roomAddress),
              });

              console.log('[Solana][TGB] Step 2: previewCharityPayout returned:', preview);
              console.log('[Solana][TGB] Charity amount from contract:', preview.amountDecimal);
              console.log('[Solana][TGB] Backend estimated:', charityAmountPreview);
              console.log('====================================================');

              let charityAmountDecimal = preview.amountDecimal;

              // Fallback if contract returns zero
              if (parseFloat(charityAmountDecimal) === 0) {
                console.warn('⚠️  [Solana][TGB] Contract returned 0!');

                if (charityAmountPreview && parseFloat(charityAmountPreview) > 0) {
                  console.warn('⚠️  [Solana][TGB] Using backend estimate instead:', charityAmountPreview);
                  charityAmountDecimal = charityAmountPreview;
                } else {
                  console.error('❌ [Solana][TGB] Both contract and backend returned 0 - cannot proceed');
                  throw new Error('Charity amount is zero from both contract and backend');
                }
              }

              const currencySym = (charityCurrency || 'USDC').toUpperCase();

              console.log('[Solana][TGB] Step 3: Requesting TGB deposit address:', {
                organizationId: charityOrgId,
                currency: currencySym,
                network: 'solana',
                amount: charityAmountDecimal,
              });

              const resp = await fetch('/api/tgb/create-deposit-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  organizationId: charityOrgId,
                  currency: currencySym,
                  network: 'solana',
                  amount: charityAmountDecimal,
                  metadata: { roomId },
                }),
              });

              const dep = await resp.json();
              if (resp.ok && dep?.ok && dep.depositAddress) {
                effectiveCharityWallet = dep.depositAddress as string;
                console.log('[Solana][TGB] Step 4: Got TGB deposit address:', effectiveCharityWallet);
              } else {
                console.error('[Solana][TGB] Deposit address request failed:', dep);
                return {
                  success: false,
                  error:
                    dep?.error ||
                    'Could not get The Giving Block deposit address for Solana charity payout',
                };
              }
            } catch (previewError: any) {
              console.error('[Solana][TGB] Error in charity preview/TGB flow:', previewError);
              return {
                success: false,
                error: `Failed to get charity amount or TGB address: ${previewError.message}`,
              };
            }
          }

          if (!effectiveCharityWallet) {
            return {
              success: false,
              error: 'Missing charity wallet for Solana prize distribution',
            };
          }

          console.log('[Solana] Step 5: Calling distributePrizes with:', {
            roomId,
            winnersCount: winnerAddresses.length,
            roomAddress,
            charityWallet: effectiveCharityWallet,
          });

          const distributeParams: any = {
            roomId,
            winners: winnerAddresses,
            roomAddress,
            charityWallet: effectiveCharityWallet,
          };

          const res = await (solanaContract as any).distributePrizes(distributeParams);

          console.log('[Solana] Step 6: Prize distribution complete:', {
            signature: res.signature,
            charityAmount: res.charityAmount,
          });

          return {
            success: true,
            txHash: res.signature as `0x${string}`,
            cleanupTxHash: res.cleanupSignature as `0x${string}` | undefined,
            rentReclaimed: res.rentReclaimed,
            charityAmount: res.charityAmount?.toString(),
          };
        } catch (e: any) {
          console.error('[Solana distributePrizes error]', e);
          return { success: false, error: e?.message || 'Solana prize distribution failed' };
        }
      };
    }

    return async (): Promise<DistributeResult> => ({
      success: false,
      error: 'Prize distribution not implemented for this chain',
    });
  }, [effectiveChain, solanaContract, evmDistributePrizes]);

  /** ---------------- DEPLOY ---------------- */
  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      if (effectiveChain === 'stellar') {
        throw new Error(
          'Stellar deployment must be handled through StellarLaunchSection component'
        );
      }

      if (effectiveChain === 'evm') {
        return evmDeploy(params);
      }

      if (effectiveChain === 'solana') {
        if (!solanaContract || !solanaContract.isReady) {
          throw new Error('Solana contract not ready');
        }
        if (!solanaContract.publicKey) {
          throw new Error('Wallet not connected');
        }

        const currency = (params.currency ?? 'USDC').toUpperCase();
        const feeTokenMint =
          currency === 'USDC'
            ? TOKEN_MINTS.USDC
            : currency === 'PYUSD'
            ? TOKEN_MINTS.PYUSD
            : currency === 'USDT'
            ? TOKEN_MINTS.USDT
            : TOKEN_MINTS.USDC;

        const decimals = currency === 'SOL' ? 9 : 6;
        const multiplier = Math.pow(10, decimals);

        console.log(
          '[deploy] Solana currency:',
          currency,
          'mint:',
          feeTokenMint.toBase58(),
          'decimals:',
          decimals
        );

        const entryFeeLamports = new BN(parseFloat(String(params.entryFee ?? '1.0')) * multiplier);

        let charityWallet: PublicKey;
        try {
          if (params.charityAddress) {
            try {
              charityWallet = new PublicKey(params.charityAddress);
              console.log(
                '[deploy] ✅ Using charity wallet from params:',
                charityWallet.toBase58()
              );
            } catch (pubkeyError: any) {
              console.error(
                '[deploy] ❌ Invalid charity address in params:',
                pubkeyError.message
              );
              throw new Error(`Invalid charity address in params: ${pubkeyError.message}`);
            }
          } else {
            const anyContract = solanaContract as any;
            if (anyContract.program && solanaContract.publicKey) {
              try {
                const [globalConfigPDA] = PublicKey.findProgramAddressSync(
                  [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
                  PROGRAM_ID
                );

                const globalConfigAccount =
                  await anyContract.program.account.globalConfig.fetch(globalConfigPDA);
                charityWallet = globalConfigAccount.charityWallet as PublicKey;
                console.log(
                  '[deploy] ✅ Using charity wallet from GlobalConfig:',
                  charityWallet.toBase58()
                );

                if (charityWallet.equals(solanaContract.publicKey)) {
                  console.warn(
                    "[deploy] ⚠️ WARNING: GlobalConfig charity wallet is the user's wallet. This is OK for devnet/testing."
                  );
                }
              } catch (fetchError: any) {
                console.log(
                  '[deploy] GlobalConfig not found or not initialized:',
                  fetchError.message
                );
                console.log(
                  '[deploy] ℹ️ Will use platform wallet as fallback - createPoolRoom will initialize GlobalConfig with it'
                );

                charityWallet = solanaContract.publicKey;
                console.log(
                  '[deploy] ✅ Using platform wallet as charity wallet fallback (will be used to initialize GlobalConfig):',
                  charityWallet.toBase58()
                );
                console.log(
                  '[deploy] ℹ️ Note: This is a placeholder. The actual TGB charity address will be used during prize distribution.'
                );
              }
            } else {
              if (!solanaContract.publicKey) {
                throw new Error('Wallet not connected - cannot determine charity wallet');
              }
              charityWallet = solanaContract.publicKey;
              console.log(
                '[deploy] ✅ Using platform wallet as charity wallet (program not ready):',
                charityWallet.toBase58()
              );
            }
          }
        } catch (error: any) {
          console.error('[deploy] ❌ Failed to get charity wallet:', error);
          if (
            error.message.includes('Invalid charity address') ||
            error.message.includes('Wallet not connected')
          ) {
            throw error;
          }
          throw new Error(
            `Failed to get charity wallet: ${error.message}. ` +
              `This may indicate a network issue or the Solana program is not properly initialized.`
          );
        }

        console.log(
          '[deploy] 📋 Final charity wallet for room creation:',
          charityWallet.toBase58()
        );
        console.log(
          '[deploy] ℹ️ Note: TGB dynamic charity addresses are used during prize distribution, not room creation.'
        );

        if (params.prizeMode === 'assets') {
          if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
            throw new Error('Asset room requires at least 1 prize');
          }

          const prizes = params.expectedPrizes.slice(0, 3);
          const [p1, p2, p3] = prizes;

          if (!p1) {
            throw new Error('Asset room requires at least 1 prize');
          }

          const prizeDecimals = 6;
          const prizeMultiplier = Math.pow(10, prizeDecimals);

          if (!p1?.tokenAddress || p1.amount == null) {
            throw new Error('Prize 1 is missing required tokenAddress or amount');
          }
          const prize1Mint = new PublicKey(p1.tokenAddress);
          const prize1Amount = new BN(Math.floor(Number(p1.amount) * prizeMultiplier));

          let prize2Mint: PublicKey | undefined = undefined;
          let prize2Amount: BN | undefined = undefined;
          if (p2?.tokenAddress && p2.amount != null) {
            prize2Mint = new PublicKey(p2.tokenAddress);
            prize2Amount = new BN(Math.floor(Number(p2.amount) * prizeMultiplier));
          }

          let prize3Mint: PublicKey | undefined = undefined;
          let prize3Amount: BN | undefined = undefined;
          if (p3?.tokenAddress && p3.amount != null) {
            prize3Mint = new PublicKey(p3.tokenAddress);
            prize3Amount = new BN(Math.floor(Number(p3.amount) * prizeMultiplier));
          }

          const assetRoomParams: any = {
            roomId: params.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: (params.hostFeePct ?? 0) * 100,
            charityMemo: params.charityName?.substring(0, 28) || 'Asset room',
            feeTokenMint,
            prize1Mint,
            prize1Amount,
          };

          if (prize2Mint && prize2Amount) {
            assetRoomParams.prize2Mint = prize2Mint;
            assetRoomParams.prize2Amount = prize2Amount;
          }
          if (prize3Mint && prize3Amount) {
            assetRoomParams.prize3Mint = prize3Mint;
            assetRoomParams.prize3Amount = prize3Amount;
          }

          const res = await (solanaContract as any).createAssetRoom(assetRoomParams);

          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        } else {
          const firstPlacePct = params.prizeSplits?.first ?? 100;
          const secondPlacePct = params.prizeSplits?.second ?? 0;
          const thirdPlacePct = params.prizeSplits?.third ?? 0;

          const res = await solanaContract.createPoolRoom({
            roomId: params.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: (params.hostFeePct ?? 0) * 100,
            prizePoolBps: (params.prizePoolPct ?? 0) * 100,
            firstPlacePct,
            secondPlacePct,
            thirdPlacePct,
            charityMemo: params.charityName?.substring(0, 28) || 'Quiz charity',
            feeTokenMint,
          });

          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        }
      }

      throw new Error(`Deployment not implemented for ${effectiveChain} chain`);
    },
    [effectiveChain, evmDeploy, solanaContract]
  );

  return { deploy, joinRoom, distributePrizes };
}