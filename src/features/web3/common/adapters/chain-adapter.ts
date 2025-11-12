/**
 * @module features/web3/common/adapters/chain-adapter
 *
 * Chain Adapter Pattern - Multi-Chain Abstraction
 *
 * ## Purpose
 * Provides a unified interface for blockchain operations across Solana, EVM, and Stellar.
 * Each chain implements the ChainAdapter interface with its own logic, while consuming
 * code uses a consistent API.
 *
 * ## Architecture
 * ```
 * Application Code
 *       ↓
 * ChainAdapter Interface (unified API)
 *       ↓
 * ┌─────────────┬─────────────┬─────────────┐
 * │   Solana    │     EVM     │   Stellar   │
 * │   Adapter   │   Adapter   │   Adapter   │
 * └─────────────┴─────────────┴─────────────┘
 *       ↓              ↓              ↓
 * Solana Program    Smart Contract   Soroban
 * ```
 *
 * ## Benefits
 * - **Consistency**: Same API for all chains
 * - **Extensibility**: Easy to add new chains
 * - **Testability**: Mock adapters for testing
 * - **Maintainability**: Chain logic isolated
 *
 * ## Usage
 * ```typescript
 * // Get adapter for selected chain
 * const adapter = getChainAdapter('solana');
 *
 * // Use unified API
 * const result = await adapter.createRoom(params);
 * ```
 *
 * @example
 * ```typescript
 * // Implementing a new chain
 * class MyChainAdapter implements ChainAdapter {
 *   async createRoom(params) {
 *     // Chain-specific implementation
 *   }
 *
 *   async joinRoom(params) {
 *     // Chain-specific implementation
 *   }
 *
 *   async distributePrizes(params) {
 *     // Chain-specific implementation
 *   }
 * }
 *
 * // Register adapter
 * chainRegistry.register('mychain', new MyChainAdapter());
 * ```
 */

import type {
  CreateRoomParams,
  CreateRoomResult,
  JoinRoomParams,
  JoinRoomResult,
  DistributePrizesParams,
  DistributePrizesResult,
  OperationResult,
} from '../types';

/**
 * Chain Adapter Interface
 *
 * All blockchain implementations must implement this interface.
 * This ensures consistent API across all supported chains.
 */
export interface ChainAdapter {
  /**
   * Chain identifier
   */
  readonly chain: 'solana' | 'evm' | 'stellar';

  /**
   * Creates a new fundraising room
   *
   * @param params - Room creation parameters
   * @returns Room creation result with contract address and tx hash
   *
   * @example
   * ```typescript
   * const result = await adapter.createRoom({
   *   roomId: 'quiz-123',
   *   hostWallet: '0x...',
   *   entryFee: '1.0',
   *   maxPlayers: 100,
   *   hostFeePct: 1,
   *   prizePoolPct: 39,
   * });
   * ```
   */
  createRoom(
    params: CreateRoomParams
  ): Promise<OperationResult<CreateRoomResult>>;

  /**
   * Joins an existing room as a player
   *
   * @param params - Join room parameters
   * @returns Join result with transaction hash
   *
   * @example
   * ```typescript
   * const result = await adapter.joinRoom({
   *   roomId: 'quiz-123',
   *   roomAddress: 'room-pda-or-contract-address',
   *   entryFee: '1.0',
   * });
   * ```
   */
  joinRoom(
    params: JoinRoomParams
  ): Promise<OperationResult<JoinRoomResult>>;

  /**
   * Distributes prizes to winners
   *
   * @param params - Prize distribution parameters
   * @returns Distribution result with transaction hash
   *
   * @example
   * ```typescript
   * const result = await adapter.distributePrizes({
   *   roomId: 'quiz-123',
   *   winners: [
   *     { playerId: '1', address: 'winner-address-1' },
   *     { playerId: '2', address: 'winner-address-2' },
   *   ],
   *   charityAddress: 'charity-address',
   * });
   * ```
   */
  distributePrizes(
    params: DistributePrizesParams
  ): Promise<OperationResult<DistributePrizesResult>>;

  /**
   * Checks if adapter is ready (wallet connected, program deployed, etc.)
   */
  isReady(): boolean;

  /**
   * Gets current wallet address
   */
  getWalletAddress(): string | null;
}

/**
 * Chain Adapter Registry
 *
 * Manages adapter instances for each chain.
 * Allows registration and retrieval of adapters.
 */
class ChainAdapterRegistry {
  private adapters = new Map<string, ChainAdapter>();

  /**
   * Registers a chain adapter
   *
   * @param chain - Chain identifier
   * @param adapter - Adapter instance
   *
   * @example
   * ```typescript
   * registry.register('solana', new SolanaAdapter());
   * ```
   */
  register(chain: string, adapter: ChainAdapter): void {
    this.adapters.set(chain, adapter);
  }

  /**
   * Gets adapter for a chain
   *
   * @param chain - Chain identifier
   * @returns Chain adapter instance
   * @throws {Error} If adapter not registered
   *
   * @example
   * ```typescript
   * const adapter = registry.get('solana');
   * ```
   */
  get(chain: string): ChainAdapter {
    const adapter = this.adapters.get(chain);
    if (!adapter) {
      throw new Error(`No adapter registered for chain: ${chain}`);
    }
    return adapter;
  }

  /**
   * Checks if adapter is registered
   *
   * @param chain - Chain identifier
   * @returns True if adapter exists
   */
  has(chain: string): boolean {
    return this.adapters.has(chain);
  }

  /**
   * Gets all registered chains
   *
   * @returns Array of chain identifiers
   */
  getChains(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Global adapter registry instance
 */
export const chainRegistry = new ChainAdapterRegistry();

/**
 * Gets adapter for a chain (convenience function)
 *
 * @param chain - Chain identifier
 * @returns Chain adapter instance
 *
 * @example
 * ```typescript
 * const adapter = getChainAdapter('solana');
 * await adapter.createRoom(params);
 * ```
 */
export function getChainAdapter(chain: string): ChainAdapter {
  return chainRegistry.get(chain);
}

/**
 * Base adapter class with common functionality
 *
 * Chain-specific adapters can extend this class to inherit
 * common logic and utilities.
 */
export abstract class BaseChainAdapter implements ChainAdapter {
  abstract readonly chain: 'solana' | 'evm' | 'stellar';

  abstract createRoom(
    params: CreateRoomParams
  ): Promise<OperationResult<CreateRoomResult>>;

  abstract joinRoom(
    params: JoinRoomParams
  ): Promise<OperationResult<JoinRoomResult>>;

  abstract distributePrizes(
    params: DistributePrizesParams
  ): Promise<OperationResult<DistributePrizesResult>>;

  abstract isReady(): boolean;

  abstract getWalletAddress(): string | null;

  /**
   * Creates a success result
   *
   * Helper method for consistent success results.
   */
  protected success<T>(data: T): T {
    return data;
  }

  /**
   * Creates an error result
   *
   * Helper method for consistent error handling.
   */
  protected error(error: string, details?: any): { success: false; error: string; errorDetails?: any } {
    return {
      success: false,
      error,
      errorDetails: details,
    };
  }

  /**
   * Validates required parameters
   *
   * Helper method for parameter validation.
   */
  protected validateRequired(params: any, required: string[]): void {
    for (const key of required) {
      if (!params[key]) {
        throw new Error(`Missing required parameter: ${key}`);
      }
    }
  }
}
