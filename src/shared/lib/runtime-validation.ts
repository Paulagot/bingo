// src/shared/lib/runtime-validation.ts
// Runtime validation utilities using type guards

import { isUser, isClub, isEntitlements, isString, isNumber, isNotNull } from './type-guards';
import type { User, Club, Entitlements } from '../types';

/**
 * Validates and parses User from unknown data
 */
export function validateUser(data: unknown): User {
  if (!isUser(data)) {
    throw new Error('Invalid user data');
  }
  return data;
}

/**
 * Validates and parses Club from unknown data
 */
export function validateClub(data: unknown): Club {
  if (!isClub(data)) {
    throw new Error('Invalid club data');
  }
  return data;
}

/**
 * Validates and parses Entitlements from unknown data
 */
export function validateEntitlements(data: unknown): Entitlements {
  if (!isEntitlements(data)) {
    throw new Error('Invalid entitlements data');
  }
  return data;
}

/**
 * Safe string parser with default value
 */
export function safeString(value: unknown, defaultValue = ''): string {
  return isString(value) ? value : defaultValue;
}

/**
 * Safe number parser with default value
 */
export function safeNumber(value: unknown, defaultValue = 0): number {
  return isNumber(value) ? value : defaultValue;
}

/**
 * Safe array parser with type guard
 */
export function safeArray<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T,
  defaultValue: T[] = []
): T[] {
  if (Array.isArray(value)) {
    return value.filter(itemGuard);
  }
  return defaultValue;
}

/**
 * Safe object parser
 */
export function safeObject(value: unknown, defaultValue: Record<string, unknown> = {}): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return defaultValue;
}

