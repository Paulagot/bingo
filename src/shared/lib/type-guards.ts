// src/shared/lib/type-guards.ts
// Type guard utilities

import type { User, Club, Entitlements } from '../types';

/**
 * Type guard for User
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

/**
 * Type guard for Club
 */
export function isClub(value: unknown): value is Club {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as Club).id === 'string' &&
    typeof (value as Club).name === 'string' &&
    typeof (value as Club).email === 'string'
  );
}

/**
 * Type guard for Entitlements
 */
export function isEntitlements(value: unknown): value is Entitlements {
  return (
    typeof value === 'object' &&
    value !== null &&
    'max_players_per_game' in value &&
    'max_rounds' in value &&
    'round_types_allowed' in value &&
    'extras_allowed' in value &&
    'concurrent_rooms' in value &&
    'game_credits_remaining' in value &&
    typeof (value as Entitlements).max_players_per_game === 'number' &&
    typeof (value as Entitlements).max_rounds === 'number' &&
    Array.isArray((value as Entitlements).round_types_allowed) &&
    Array.isArray((value as Entitlements).extras_allowed) &&
    typeof (value as Entitlements).concurrent_rooms === 'number' &&
    typeof (value as Entitlements).game_credits_remaining === 'number'
  );
}

/**
 * Type guard for non-null value
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard for array
 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (itemGuard) {
    return value.every(itemGuard);
  }
  return true;
}

/**
 * Type guard for object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

