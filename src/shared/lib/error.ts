// src/shared/lib/error.ts
// Error handling utilities

/**
 * Checks if an error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Gets error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Gets error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) return error.stack;
  return undefined;
}

/**
 * Creates a user-friendly error message
 */
export function createUserFriendlyError(error: unknown): string {
  const message = getErrorMessage(error);
  
  // Map common error messages to user-friendly ones
  if (message.includes('Network')) return 'Network error. Please check your connection and try again.';
  if (message.includes('timeout')) return 'Request timed out. Please try again.';
  if (message.includes('401') || message.includes('Unauthorized')) return 'You are not authorized. Please log in again.';
  if (message.includes('403') || message.includes('Forbidden')) return 'You do not have permission to perform this action.';
  if (message.includes('404') || message.includes('Not Found')) return 'The requested resource was not found.';
  if (message.includes('500') || message.includes('Internal Server Error')) return 'Server error. Please try again later.';
  
  return message || 'An unexpected error occurred. Please try again.';
}

/**
 * Logs an error with context
 */
export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);
  
  console.error(`[Error]${context ? ` [${context}]` : ''}:`, message);
  if (stack) {
    console.error('Stack:', stack);
  }
}

