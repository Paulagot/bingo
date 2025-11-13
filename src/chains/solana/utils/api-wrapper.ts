/**
 * @module chains/solana/utils/api-wrapper
 *
 * API Wrapper Factory
 *
 * ## Purpose
 *
 * This module provides a factory function for creating API wrappers with error enhancement.
 * The factory returns a function that takes context and returns the wrapped API function.
 * The hook then wraps this with `useCallback` for proper React memoization.
 *
 * ## Architecture Decision: Factory Pattern
 *
 * **Why a Factory Function?**
 *
 * The original `createApiWrapper` was defined inside the hook and had access to `context`
 * via closure. When extracted, we need to pass context differently. This factory returns
 * a function that takes context and returns the wrapped function. The hook then wraps
 * that with `useCallback`.
 *
 * **Usage Pattern**:
 *
 * ```typescript
 * // Create factory
 * const factory = createApiWrapper('operationName', apiFunction, []);
 *
 * // In hook, wrap with useCallback
 * const wrappedFunc = useCallback(factory(context), [context, ...deps]);
 * ```
 *
 * ## Error Enhancement Strategy
 *
 * Errors are enhanced with:
 *
 * 1. **Operation name prefix**: `[useSolanaContract:operationName]` for easy filtering in logs
 * 2. **Original error message**: Preserved for context
 * 3. **Stack trace**: Preserved for debugging
 * 4. **Original error properties**: All properties from the original error are preserved
 *
 * This allows developers to:
 * - Filter errors by operation in logs
 * - See the full error context
 * - Debug with original stack traces
 *
 * ## Integration Points
 *
 * - Used by all domain hooks (`useSolanaAdmin`, `useSolanaRooms`, etc.)
 * - Wraps functions from `@/features/web3/solana/api/*` modules
 * - Provides consistent error handling across all operations
 */

import type { DependencyList } from 'react';
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Creates a factory function for wrapping API functions with error handling
 *
 * ## Purpose
 *
 * This factory function creates a wrapper for API functions from `@/features/web3/solana/api/*`.
 * The wrapper provides error enhancement with operation names for better debugging.
 *
 * ## How It Works
 *
 * 1. **Factory Creation**: Returns a function that takes `context` as parameter
 * 2. **Context Injection**: The returned function captures context and returns the wrapped API function
 * 3. **Error Enhancement**: Catches errors and enhances them with operation name
 * 4. **Hook Integration**: The hook wraps the result with `useCallback` for memoization
 *
 * ## Usage
 *
 * ```typescript
 * // Create factory (once, outside hook or in hook body)
 * const factory = createApiWrapper(
 *   'getRoomInfo',
 *   async (ctx, roomAddress: PublicKey) => {
 *     return await getRoomInfoAPI(ctx, roomAddress);
 *   },
 *   []
 * );
 *
 * // In hook, wrap with useCallback
 * const getRoomInfo = useCallback(
 *   factory(context),
 *   [context]
 * );
 * ```
 *
 * ## Type Safety
 *
 * The function is fully typed with generics:
 * - `TParams`: Tuple type for function parameters (excluding context)
 * - `TResult`: Return type of the API function
 *
 * This ensures type safety throughout the wrapper chain.
 *
 * @template TParams - Tuple type for function parameters (excluding context)
 * @template TResult - Return type of the API function
 *
 * @param operationName - Name of the operation (used in error messages)
 * @param apiFunction - The API function to wrap (must accept context as first param)
 * @param dependencies - Additional React dependencies (for documentation, not used in factory)
 *
 * @returns Factory function that takes context and returns the wrapped function
 *
 * @example
 * ```typescript
 * const factory = createApiWrapper(
 *   'createRoom',
 *   async (ctx, params: CreateRoomParams) => {
 *     return await createRoomAPI(ctx, params);
 *   },
 *   []
 * );
 *
 * // In hook:
 * const createRoom = useCallback(factory(context), [context]);
 * ```
 */
export function createApiWrapper<TParams extends any[], TResult>(
  operationName: string,
  apiFunction: (
    context: SolanaContractContext,
    ...args: TParams
  ) => Promise<TResult>,
  dependencies: DependencyList
): (context: SolanaContractContext) => (...args: TParams) => Promise<TResult> {
  return (context: SolanaContractContext) => {
    return async (...args: TParams): Promise<TResult> => {
      try {
        return await apiFunction(context, ...args);
      } catch (error: any) {
        // Enhance error message with operation name for better debugging
        const enhancedError = new Error(
          `[useSolanaContract:${operationName}] ${error.message || 'Unknown error'}`
        );
        // Preserve original error stack and properties
        if (error.stack) {
          enhancedError.stack = error.stack;
        }
        Object.assign(enhancedError, error);
        throw enhancedError;
      }
    };
  };
}
