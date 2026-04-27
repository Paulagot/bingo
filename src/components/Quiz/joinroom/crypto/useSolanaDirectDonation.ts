// src/components/Quiz/joinroom/crypto/useSolanaDirectDonation.ts

import { useCallback } from 'react';
import {
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from '@solana/spl-token';

import { useSolanaShared } from '../../../../chains/solana/hooks/useSolanaShared';

import {
  SOLANA_TOKENS,
  toRawAmount,
  type SolanaTokenCode,
} from '../../../../chains/solana/config/solanaTokenConfig';

import type { SolanaNetworkKey } from '../../../../chains/solana/config/networks';

export type SolanaDirectDonationResult =
  | {
      success: true;
      txHash: string;
      fromWallet: string;
      toWallet: string;
      tokenCode: SolanaTokenCode;
      tokenMint: string | null;
      rawAmount: string;
      displayAmount: string;
      network: SolanaNetworkKey;
      explorerUrl?: string;
    }
  | {
      success: false;
      error: string;
    };

export interface SendSolanaDirectDonationParams {
  recipientWalletAddress: string;
  tokenCode: SolanaTokenCode;
  displayAmount: string | number;
}

export interface UseSolanaDirectDonationParams {
  cluster?: SolanaNetworkKey;
}

export function useSolanaDirectDonation(
  params?: UseSolanaDirectDonationParams
) {
  const requestedCluster = params?.cluster || 'mainnet';

  const {
    publicKey,
    connection,
    isWalletConnected,
    cluster,
    getTxExplorerUrl,
    sendTransaction,
  } = useSolanaShared({
    clusterOverride: requestedCluster,
  });

  const sendDonation = useCallback(
    async ({
      recipientWalletAddress,
      tokenCode,
      displayAmount,
    }: SendSolanaDirectDonationParams): Promise<SolanaDirectDonationResult> => {
      try {
        if (!connection || !publicKey) {
          return {
            success: false,
            error: 'Solana wallet or connection is not ready.',
          };
        }

        if (!isWalletConnected) {
          return {
            success: false,
            error: 'Please connect your Solana wallet first.',
          };
        }

        const token = SOLANA_TOKENS[tokenCode];

        if (!token) {
          return {
            success: false,
            error: `Unsupported token: ${tokenCode}`,
          };
        }

        const recipientPublicKey = new PublicKey(recipientWalletAddress);
        const rawAmount = toRawAmount(displayAmount, tokenCode);

        if (rawAmount <= 0n) {
          return {
            success: false,
            error: 'Donation amount must be greater than zero.',
          };
        }

        const tx = new Transaction();

        /**
         * Native SOL transfer.
         */
        if (token.isNative) {
          const lamports = Number(rawAmount);

          if (!Number.isSafeInteger(lamports) || lamports <= 0) {
            return {
              success: false,
              error: 'Invalid SOL amount.',
            };
          }

          tx.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: recipientPublicKey,
              lamports,
            })
          );
        } else {
          /**
           * SPL token transfer.
           */
          if (!token.mint) {
            return {
              success: false,
              error: `Missing mint address for ${tokenCode}.`,
            };
          }

          const mintPublicKey = new PublicKey(token.mint);

          const senderAta = await getAssociatedTokenAddress(
            mintPublicKey,
            publicKey
          );

          const recipientAta = await getAssociatedTokenAddress(
            mintPublicKey,
            recipientPublicKey
          );

          const senderAtaInfo = await connection.getAccountInfo(senderAta);

          if (!senderAtaInfo) {
            return {
              success: false,
              error: `Your wallet does not have a ${tokenCode} token account or balance.`,
            };
          }

          const recipientAtaInfo = await connection.getAccountInfo(recipientAta);

          /**
           * If the club wallet does not yet have an ATA for this token,
           * the player pays the small rent fee to create it.
           */
          if (!recipientAtaInfo) {
            tx.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                recipientAta,
                recipientPublicKey,
                mintPublicKey
              )
            );
          }

          tx.add(
            createTransferInstruction(
              senderAta,
              recipientAta,
              publicKey,
              rawAmount
            )
          );
        }

        /**
         * Let the wallet provider send the tx when available.
         * This generally gives wallets a better chance to display
         * the correct token/amount than signTransaction + sendRawTransaction.
         */
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');

        tx.feePayer = publicKey;
        tx.recentBlockhash = latestBlockhash.blockhash;
        console.log('[SolanaDirectDonation] Payment review before wallet send:', {
  tokenCode,
  displayAmount: String(displayAmount),
  rawAmount: rawAmount.toString(),
  recipient: recipientPublicKey.toBase58(),
  sender: publicKey.toBase58(),
  isNative: token.isNative,
  mint: token.mint,
});

   const signature = await sendTransaction(tx, connection);

if (!signature) {
  return {
    success: false,
    error: 'Wallet did not return a transaction signature.',
  };
}

/**
 * Do not confirm the transaction here for direct crypto donations.
 *
 * The shared Solana connection uses websocket subscriptions for the existing
 * smart-contract Web3 flow. That can throw repeated signatureSubscribe errors
 * in this simple direct-transfer flow, even when the transfer succeeds.
 *
 * The backend /api/quiz/crypto-donation/confirm route is now responsible for:
 * - fetching the tx from Solana RPC
 * - verifying sender / recipient / amount / token
 * - writing fundraisely_web3_transactions
 * - writing fundraisely_quiz_payment_ledger
 */
return {
  success: true,
  txHash: signature,
  fromWallet: publicKey.toBase58(),
  toWallet: recipientPublicKey.toBase58(),
  tokenCode,
  tokenMint: token.mint,
  rawAmount: rawAmount.toString(),
  displayAmount: String(displayAmount),
  network: cluster,
  explorerUrl: getTxExplorerUrl(signature),
};
      } catch (error: any) {
        console.error('[useSolanaDirectDonation] failed:', error);

        const message =
          error?.message ||
          error?.reason ||
          error?.data?.message ||
          'Failed to send Solana donation.';

        return {
          success: false,
          error: message,
        };
      }
    },
    [
      connection,
      publicKey,
      isWalletConnected,
      cluster,
      getTxExplorerUrl,
      sendTransaction,
    ]
  );

  return {
    sendDonation,
    isWalletConnected,
    publicKey,
    cluster,
  };
}