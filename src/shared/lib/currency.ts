// src/shared/lib/currency.ts
// Currency formatting and detection utilities

type Region = 'IE' | 'UK';

const ENV_REGION = (import.meta as { env?: { VITE_DEFAULT_REGION?: Region } })?.env?.VITE_DEFAULT_REGION;

/**
 * Detects region from URL or environment variable
 */
export function detectRegionFromUrl(): Region {
  if (ENV_REGION) return ENV_REGION;
  if (typeof window === 'undefined') return 'IE';
  const host = window.location.hostname || '';
  if (host.endsWith('.co.uk')) return 'UK';
  if (host.endsWith('.ie')) return 'IE';
  return 'IE';
}

/**
 * Gets currency symbol based on region
 */
export function currencySymbol(): '€' | '£' {
  return detectRegionFromUrl() === 'UK' ? '£' : '€';
}

/**
 * Gets currency ISO code based on region
 */
export function currencyISO(): 'GBP' | 'EUR' {
  return detectRegionFromUrl() === 'UK' ? 'GBP' : 'EUR';
}

/**
 * Formats money value based on region
 */
export function formatMoney(value: number): string {
  const region = detectRegionFromUrl();
  const locale = region === 'UK' ? 'en-GB' : 'en-IE';
  const iso = region === 'UK' ? 'GBP' : 'EUR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: iso,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a number as currency with custom options
 */
export function formatCurrency(
  value: number,
  options?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const region = detectRegionFromUrl();
  const locale = options?.locale || (region === 'UK' ? 'en-GB' : 'en-IE');
  const currency = options?.currency || (region === 'UK' ? 'GBP' : 'EUR');

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value);
}

