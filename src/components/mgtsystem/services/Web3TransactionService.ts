// src/components/web3/services/Web3TransactionService.ts
//
// Frontend service for recording confirmed Web3 transactions in the
// FundRaisely ledger (fundraisely_web3_transactions).
//
// Pattern: extends BaseService — same as all other FundRaisely services.
// These are unauthenticated endpoints; no auth token is sent.
//
// Usage:
//   import web3TransactionService from './Web3TransactionService';
//   await web3TransactionService.recordJoinPayment({ ... });

import BaseService from './BaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GameType = 'elimination' | 'quiz';
export type Chain    = 'solana' | 'evm';

export interface JoinPaymentParams {
  /** Which game this payment belongs to */
  game_type: GameType;
  /** The server-side room ID */
  room_id: string;
  /** Player's wallet address */
  wallet_address: string;
  /** Chain family */
  chain: Chain;
  /** Network name — e.g. 'devnet', 'mainnet', 'base_sepolia', 'base' */
  network: string;
  /** On-chain transaction hash / signature */
  tx_hash: string;
  /** Token symbol e.g. 'USDC', 'SOL' */
  fee_token: string;
  /** Token mint address (Solana) or ERC-20 contract address (EVM). Optional. */
  token_address?: string | null;
  /**
   * Total amount paid in raw token units (before decimal conversion).
   * e.g. for 1 USDC (6 decimals) this would be 1_000_000
   */
  amount: number;
  /**
   * Entry fee portion of amount, in raw token units.
   * entry_fee_amount + extras_amount + donation_amount must equal amount.
   */
  entry_fee_amount: number;
  /** Extras portion in raw token units. 0 if no extras. */
  extras_amount?: number;
  /** Donation uplift portion in raw token units. 0 if no donation. */
  donation_amount?: number;
  /** Solana cluster — required when chain === 'solana' */
  solana_cluster?: 'devnet' | 'mainnet';
  /** Optional metadata — extras detail, wallet provider info, etc. */
  metadata_json?: Record<string, unknown> | null;
}

export interface JoinPaymentResult {
  success: boolean;
  id: string | null;
  duplicate: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class Web3TransactionService extends BaseService {
  /**
   * Record a confirmed player join payment in the ledger.
   *
   * Call this immediately after on-chain confirmation is received,
   * BEFORE emitting the socket join event. If the call fails (network
   * error, RPC issue etc.) it is safe to proceed with the socket join —
   * the ledger write is non-blocking for the player flow.
   *
   * The server will re-verify the tx on-chain before writing to the DB,
   * so you don't need to pass any proof beyond the tx hash.
   *
   * @example
   * // Elimination
   * const txResult = await solanaJoinRoom({ ... });
   * if (txResult.success) {
   *   await web3TransactionService.recordJoinPayment({
   *     game_type:        'elimination',
   *     room_id:          roomData.roomId,
   *     wallet_address:   walletAddress,
   *     chain:            'solana',
   *     network:          roomData.solanaCluster ?? 'mainnet',
   *     solana_cluster:   roomData.solanaCluster ?? 'mainnet',
   *     tx_hash:          txResult.txHash,
   *     fee_token:        tokenSymbol,
   *     token_address:    roomData.feeMint,
   *     amount:           roomData.entryFee,
   *     entry_fee_amount: roomData.entryFee,
   *   });
   *   onPaymentDone(txResult.txHash);
   * }
   */
  async recordJoinPayment(params: JoinPaymentParams): Promise<JoinPaymentResult> {
    try {
      const result = await this.request<JoinPaymentResult>(
        '/web3-transactions/join-payment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_type:        params.game_type,
            room_id:          params.room_id,
            wallet_address:   params.wallet_address,
            chain:            params.chain,
            network:          params.network,
            tx_hash:          params.tx_hash,
            fee_token:        params.fee_token,
            token_address:    params.token_address   ?? null,
            amount:           params.amount,
            entry_fee_amount: params.entry_fee_amount,
            extras_amount:    params.extras_amount    ?? 0,
            donation_amount:  params.donation_amount  ?? 0,
            solana_cluster:   params.solana_cluster   ?? null,
            metadata_json:    params.metadata_json    ?? null,
          }),
        }
      );
      return result;
    } catch (err: unknown) {
      // Ledger write failures are non-critical for the player join flow.
      // Log the error but don't throw — the game should not be blocked
      // if the ledger write fails due to an RPC hiccup or network issue.
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Web3TransactionService] recordJoinPayment failed:', message);
      return { success: false, id: null, duplicate: false };
    }
  }
}

// Export a single shared instance — same pattern as other FundRaisely services
export const web3TransactionService = new Web3TransactionService();
export default web3TransactionService;