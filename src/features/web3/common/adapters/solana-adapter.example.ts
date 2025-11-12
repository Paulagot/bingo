/**
 * @module features/web3/common/adapters/solana-adapter
 *
 * Solana Chain Adapter Implementation (Example/Template)
 *
 * ## Purpose
 * This is an EXAMPLE implementation showing how to create a Solana adapter
 * that implements the ChainAdapter interface. The actual implementation should
 * use the existing `useSolanaContract` hook logic.
 *
 * ## Usage
 * Once extracted from `useSolanaContract.ts`, register with:
 * ```typescript
 * chainRegistry.register('solana', new SolanaAdapter(context));
 * ```
 *
 * ## Migration Strategy
 * 1. Extract operations from `useSolanaContract.ts` into `api/` modules
 * 2. Implement adapter methods by calling those API modules
 * 3. Register adapter in application initialization
 * 4. Update `useContractActions` to use adapter pattern
 */

import {
  BaseChainAdapter,
  type ChainAdapter,
} from './chain-adapter';
import type {
  CreateRoomParams,
  CreateRoomResult,
  JoinRoomParams,
  JoinRoomResult,
  DistributePrizesParams,
  DistributePrizesResult,
  OperationResult,
} from '../types';
import type { SolanaContractContext } from '../../solana/model/types';

/**
 * Solana Chain Adapter
 *
 * Implements ChainAdapter interface for Solana blockchain operations.
 *
 * @example
 * ```typescript
 * // Create adapter with Solana context
 * const adapter = new SolanaAdapter({
 *   program,
 *   provider,
 *   publicKey,
 *   connected: true,
 *   isReady: true,
 * });
 *
 * // Use unified API
 * const result = await adapter.createRoom({
 *   roomId: 'quiz-123',
 *   hostWallet: publicKey.toBase58(),
 *   entryFee: '1.0',
 *   maxPlayers: 100,
 *   hostFeePct: 1,
 *   prizePoolPct: 39,
 *   currency: 'USDC',
 * });
 * ```
 */
export class SolanaAdapter extends BaseChainAdapter {
  readonly chain = 'solana' as const;

  constructor(private context: SolanaContractContext) {
    super();
  }

  /**
   * Creates a new fundraising room on Solana
   *
   * @param params - Room creation parameters
   * @returns Room creation result or error
   *
   * @example
   * ```typescript
   * const result = await adapter.createRoom({
   *   roomId: 'quiz-123',
   *   hostWallet: publicKey.toBase58(),
   *   entryFee: '1.0',
   *   currency: 'USDC',
   *   maxPlayers: 100,
   *   hostFeePct: 1,
   *   prizePoolPct: 39,
   *   prizeMode: 'pool',
   * });
   *
   * if (result.success) {
   *   console.log('Room created:', result.contractAddress);
   * } else {
   *   console.error('Error:', result.error);
   * }
   * ```
   */
  async createRoom(
    params: CreateRoomParams
  ): Promise<OperationResult<CreateRoomResult>> {
    try {
      // Validate context
      if (!this.isReady()) {
        return this.error('Solana contract not ready');
      }

      // Validate required parameters
      this.validateRequired(params, ['roomId', 'hostWallet', 'entryFee', 'maxPlayers']);

      // TODO: Call extracted API module
      // Example:
      // import { createPoolRoom } from '@/features/web3/solana/api/room/create-pool-room';
      // const result = await createPoolRoom(this.context, {
      //   roomId: params.roomId,
      //   charityWallet: new PublicKey(params.charityAddress),
      //   entryFee: new BN(parseFloat(params.entryFee) * 1e6),
      //   maxPlayers: params.maxPlayers,
      //   hostFeeBps: params.hostFeePct * 100,
      //   prizePoolBps: (params.prizePoolPct || 0) * 100,
      //   ...
      // });

      // For now, return placeholder that would integrate with existing code
      return this.error('Solana adapter not yet implemented - use useSolanaContract directly');

      // When implemented, return success:
      // return this.success({
      //   success: true,
      //   contractAddress: result.room,
      //   txHash: result.signature,
      //   explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
      // });
    } catch (error: any) {
      return this.error(error.message || 'Failed to create room', error);
    }
  }

  /**
   * Joins an existing room on Solana
   *
   * @param params - Join room parameters
   * @returns Join result or error
   */
  async joinRoom(
    params: JoinRoomParams
  ): Promise<OperationResult<JoinRoomResult>> {
    try {
      if (!this.isReady()) {
        return this.error('Solana contract not ready');
      }

      this.validateRequired(params, ['roomId']);

      // TODO: Call extracted API module
      // Example:
      // import { joinRoom } from '@/features/web3/solana/api/player/join-room';
      // const result = await joinRoom(this.context, { ... });

      return this.error('Solana adapter not yet implemented - use useSolanaContract directly');

      // When implemented:
      // return this.success({
      //   success: true,
      //   txHash: result.signature,
      //   explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
      // });
    } catch (error: any) {
      return this.error(error.message || 'Failed to join room', error);
    }
  }

  /**
   * Distributes prizes to winners on Solana
   *
   * @param params - Prize distribution parameters
   * @returns Distribution result or error
   */
  async distributePrizes(
    params: DistributePrizesParams
  ): Promise<OperationResult<DistributePrizesResult>> {
    try {
      if (!this.isReady()) {
        return this.error('Solana contract not ready');
      }

      this.validateRequired(params, ['roomId', 'winners']);

      // TODO: Call extracted API module
      // Example:
      // import { distributePrizes } from '@/features/web3/solana/api/prizes/distribute';
      // const result = await distributePrizes(this.context, { ... });

      return this.error('Solana adapter not yet implemented - use useSolanaContract directly');

      // When implemented:
      // return this.success({
      //   success: true,
      //   txHash: result.signature,
      //   cleanupTxHash: result.cleanupSignature,
      //   rentReclaimed: result.rentReclaimed,
      //   charityAmount: result.charityAmount,
      //   explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
      // });
    } catch (error: any) {
      return this.error(error.message || 'Failed to distribute prizes', error);
    }
  }

  /**
   * Checks if Solana adapter is ready
   *
   * @returns True if wallet connected and program ready
   */
  isReady(): boolean {
    return this.context.isReady;
  }

  /**
   * Gets current Solana wallet address
   *
   * @returns Wallet address or null if not connected
   */
  getWalletAddress(): string | null {
    return this.context.publicKey?.toBase58() || null;
  }
}
