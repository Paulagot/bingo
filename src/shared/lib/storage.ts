// src/shared/lib/storage.ts
// LocalStorage and sessionStorage utilities

/**
 * Safely gets an item from localStorage
 */
export function getStorageItem<T>(key: string, defaultValue: T | null = null): T | null {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely sets an item in localStorage
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely removes an item from localStorage
 */
export function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely gets a string item from localStorage (non-JSON)
 */
export function getStorageString(key: string, defaultValue: string | null = null): string | null {
  if (typeof window === 'undefined') return defaultValue;
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely sets a string item in localStorage (non-JSON)
 */
export function setStorageString(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all items from localStorage
 */
export function clearStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
}

