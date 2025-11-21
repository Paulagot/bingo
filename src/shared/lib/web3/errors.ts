/**
 * @module shared/lib/web3/errors
 *
 * ## Purpose
 * Provides error handling utilities for Web3 operations across multiple blockchains.
 * Parses blockchain-specific errors into user-friendly messages, extracts error codes,
 * and provides consistent error handling patterns.
 *
 * ## Cross-Chain Error Handling
 * - **Solana**: Anchor errors, program errors, RPC errors
 * - **EVM**: Revert reasons, contract errors, RPC errors
 * - **Stellar**: Soroban errors, transaction errors
 *
 * ## Public API
 * - `parseWeb3Error()` - Parse any Web3 error to user-friendly message
 * - `isSolanaError()` - Check if error is Solana-specific
 * - `isEVMError()` - Check if error is EVM-specific
 * - `formatErrorForUser()` - Format error for user display
 * - `isUserRejection()` - Check if user rejected transaction
 *
 * @example
 * ```typescript
 * import { parseWeb3Error, formatErrorForUser } from '@/shared/lib/web3/errors';
 *
 * try {
 *   await sendTransaction();
 * } catch (error) {
 *   const parsed = parseWeb3Error(error);
 *   alert(formatErrorForUser(parsed));
 * }
 * ```
 */

/**
 * Common error types across all chains
 */
export enum Web3ErrorType {
  USER_REJECTED = 'USER_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_PARAMS = 'INVALID_PARAMS',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  BLOCKHASH_EXPIRED = 'BLOCKHASH_EXPIRED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Parsed error structure
 */
export interface ParsedWeb3Error {
  /** Error type category */
  type: Web3ErrorType;
  /** User-friendly message */
  message: string;
  /** Technical error message */
  technicalMessage?: string;
  /** Error code (if available) */
  code?: string | number;
  /** Transaction logs (Solana) or revert reason (EVM) */
  logs?: string[];
  /** Original error object */
  originalError: any;
  /** Suggested action for user */
  suggestedAction?: string;
}

/**
 * Parses a Web3 error into a structured format
 *
 * Detects the blockchain and error type, then extracts relevant information
 * into a consistent structure.
 *
 * @param error - Error object from Web3 operation
 * @returns Parsed error with type, message, and metadata
 *
 * @example
 * ```typescript
 * try {
 *   await program.methods.joinRoom(...).rpc();
 * } catch (error) {
 *   const parsed = parseWeb3Error(error);
 *   console.log('Error type:', parsed.type);
 *   console.log('User message:', parsed.message);
 *   console.log('Logs:', parsed.logs);
 * }
 * ```
 */
export function parseWeb3Error(error: any): ParsedWeb3Error {
  // User rejection
  if (isUserRejection(error)) {
    return {
      type: Web3ErrorType.USER_REJECTED,
      message: 'Transaction was rejected by user',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'Please try again and approve the transaction in your wallet',
    };
  }

  // Solana-specific errors
  if (isSolanaError(error)) {
    return parseSolanaError(error);
  }

  // EVM-specific errors
  if (isEVMError(error)) {
    return parseEVMError(error);
  }

  // Network/RPC errors
  if (isNetworkError(error)) {
    return {
      type: Web3ErrorType.NETWORK_ERROR,
      message: 'Network error occurred',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'Check your internet connection and try again',
    };
  }

  // Timeout errors
  if (isTimeoutError(error)) {
    return {
      type: Web3ErrorType.TIMEOUT,
      message: 'Transaction timeout',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'The network may be congested. Please try again',
    };
  }

  // Generic error
  return {
    type: Web3ErrorType.UNKNOWN,
    message: error.message || 'An unknown error occurred',
    technicalMessage: error.message,
    originalError: error,
    suggestedAction: 'Please try again or contact support if the issue persists',
  };
}

/**
 * Checks if error is a user rejection
 *
 * @param error - Error object
 * @returns True if user rejected the transaction
 */
export function isUserRejection(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected by user') ||
    message.includes('user cancelled') ||
    error?.code === 4001 // EIP-1193: User Rejected Request
  );
}

/**
 * Checks if error is Solana-specific
 *
 * @param error - Error object
 * @returns True if error is from Solana
 */
export function isSolanaError(error: any): boolean {
  return (
    error?.name?.includes('SendTransactionError') ||
    error?.name?.includes('AnchorError') ||
    error?.message?.includes('Solana') ||
    error?.message?.includes('blockhash') ||
    typeof error?.getLogs === 'function'
  );
}

/**
 * Checks if error is EVM-specific
 *
 * @param error - Error object
 * @returns True if error is from EVM chain
 */
export function isEVMError(error: any): boolean {
  return (
    error?.message?.includes('execution reverted') ||
    error?.message?.includes('gas required exceeds') ||
    error?.message?.includes('insufficient funds for gas') ||
    error?.reason !== undefined
  );
}

/**
 * Checks if error is a network error
 *
 * @param error - Error object
 * @returns True if error is network-related
 */
export function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('connection') ||
    message.includes('econnrefused')
  );
}

/**
 * Checks if error is a timeout
 *
 * @param error - Error object
 * @returns True if error is a timeout
 */
export function isTimeoutError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    error?.code === 'ETIMEDOUT'
  );
}

/**
 * Parses Solana-specific errors
 *
 * @param error - Solana error object
 * @returns Parsed error
 */
function parseSolanaError(error: any): ParsedWeb3Error {
  // Blockhash expired
  if (error.message?.includes('Blockhash not found') || error.message?.includes('blockhash')) {
    return {
      type: Web3ErrorType.BLOCKHASH_EXPIRED,
      message: 'Transaction expired before it could be sent',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'Please try again and approve the transaction quickly',
    };
  }

  // Insufficient funds (SOL for fees or tokens for operation)
  if (error.message?.includes('insufficient funds') || error.message?.includes('custom program error: 0x1')) {
    return {
      type: Web3ErrorType.INSUFFICIENT_FUNDS,
      message: 'Insufficient funds for this transaction',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'Ensure you have enough SOL for transaction fees and tokens for the operation',
    };
  }

  // Account not found
  if (error.message?.includes('AccountNotFound') || error.message?.includes('could not find account')) {
    return {
      type: Web3ErrorType.ACCOUNT_NOT_FOUND,
      message: 'Required account not found',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'The account may not exist yet. Try creating it first',
    };
  }

  // Anchor errors (contract-specific)
  if (error.name?.includes('AnchorError')) {
    let logs: string[] = [];
    if (typeof error.getLogs === 'function') {
      try {
        logs = error.getLogs() || [];
      } catch {
        // Ignore getLogs errors
      }
    }

    return {
      type: Web3ErrorType.CONTRACT_ERROR,
      message: error.message || 'Smart contract error',
      technicalMessage: error.message,
      code: error.code,
      logs,
      originalError: error,
      suggestedAction: 'Check the transaction parameters and try again',
    };
  }

  // Generic Solana error
  return {
    type: Web3ErrorType.UNKNOWN,
    message: error.message || 'Solana transaction failed',
    technicalMessage: error.message,
    originalError: error,
  };
}

/**
 * Parses EVM-specific errors
 *
 * @param error - EVM error object
 * @returns Parsed error
 */
function parseEVMError(error: any): ParsedWeb3Error {
  // Execution reverted (contract error)
  if (error.message?.includes('execution reverted')) {
    const reason = error.reason || extractRevertReason(error.message);

    return {
      type: Web3ErrorType.CONTRACT_ERROR,
      message: reason || 'Smart contract execution reverted',
      technicalMessage: error.message,
      code: error.code,
      originalError: error,
      suggestedAction: 'Check the transaction parameters and contract requirements',
    };
  }

  // Insufficient funds for gas
  if (error.message?.includes('insufficient funds for gas')) {
    return {
      type: Web3ErrorType.INSUFFICIENT_FUNDS,
      message: 'Insufficient funds for gas fees',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'Add more ETH/native token to your wallet for gas fees',
    };
  }

  // Gas estimation failed
  if (error.message?.includes('gas required exceeds')) {
    return {
      type: Web3ErrorType.CONTRACT_ERROR,
      message: 'Transaction would fail (gas estimation error)',
      technicalMessage: error.message,
      originalError: error,
      suggestedAction: 'The transaction is likely to fail. Check contract requirements',
    };
  }

  // Generic EVM error
  return {
    type: Web3ErrorType.UNKNOWN,
    message: error.message || 'EVM transaction failed',
    technicalMessage: error.message,
    originalError: error,
  };
}

/**
 * Extracts revert reason from error message
 *
 * @param message - Error message
 * @returns Extracted revert reason or null
 */
function extractRevertReason(message: string): string | null {
  const match = message.match(/reverted with reason string '(.+)'/);
  return match ? match[1] : null;
}

/**
 * Formats error for user display
 *
 * Converts parsed error to a user-friendly message with suggested action.
 *
 * @param error - Parsed error object
 * @param options - Formatting options
 * @param options.showTechnical - Include technical details (default: false)
 * @param options.showLogs - Include transaction logs (default: false)
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * const parsed = parseWeb3Error(error);
 * const userMessage = formatErrorForUser(parsed);
 * alert(userMessage);
 *
 * // With technical details (for developers)
 * const devMessage = formatErrorForUser(parsed, { showTechnical: true, showLogs: true });
 * console.error(devMessage);
 * ```
 */
export function formatErrorForUser(
  error: ParsedWeb3Error,
  options: {
    showTechnical?: boolean;
    showLogs?: boolean;
  } = {}
): string {
  const { showTechnical = false, showLogs = false } = options;

  let message = error.message;

  if (error.suggestedAction) {
    message += `\n\n${error.suggestedAction}`;
  }

  if (showTechnical && error.technicalMessage) {
    message += `\n\nTechnical details: ${error.technicalMessage}`;
  }

  if (showLogs && error.logs && error.logs.length > 0) {
    message += `\n\nTransaction logs:\n${error.logs.join('\n')}`;
  }

  return message;
}

/**
 * Creates a consistent error response for API handlers
 *
 * @param error - Web3 error
 * @returns Error response object
 *
 * @example
 * ```typescript
 * try {
 *   await deployRoom(...);
 *   return { success: true, ... };
 * } catch (error) {
 *   return createErrorResponse(error);
 * }
 * ```
 */
export function createErrorResponse(error: any): {
  success: false;
  error: string;
  errorType?: Web3ErrorType;
  errorDetails?: any;
} {
  const parsed = parseWeb3Error(error);

  return {
    success: false,
    error: parsed.message,
    errorType: parsed.type,
    errorDetails: parsed.technicalMessage,
  };
}
