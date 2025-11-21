// src/features/auth/lib/token.ts
// Token management utilities

import { getStorageString, setStorageString, removeStorageItem } from '@shared/lib';

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Gets the authentication token from storage
 */
export function getAuthToken(): string | null {
  return getStorageString(AUTH_TOKEN_KEY);
}

/**
 * Sets the authentication token in storage
 */
export function setAuthToken(token: string): boolean {
  return setStorageString(AUTH_TOKEN_KEY, token);
}

/**
 * Removes the authentication token from storage
 */
export function removeAuthToken(): boolean {
  return removeStorageItem(AUTH_TOKEN_KEY);
}

/**
 * Checks if user is authenticated (has token)
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

