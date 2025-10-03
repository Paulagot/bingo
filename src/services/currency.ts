// src/services/currency.ts
type Region = 'IE' | 'UK';

const ENV_REGION = (import.meta as any)?.env?.VITE_DEFAULT_REGION as Region | undefined;

export function detectRegionFromUrl(): Region {
  if (ENV_REGION) return ENV_REGION;              // handy for localhost/previews
  if (typeof window === 'undefined') return 'IE'; // default on SSR/build
  const host = window.location.hostname || '';
  if (host.endsWith('.co.uk')) return 'UK';
  if (host.endsWith('.ie')) return 'IE';
  return 'IE';
}

export function currencySymbol(): '€' | '£' {
  return detectRegionFromUrl() === 'UK' ? '£' : '€';
}

export function currencyISO(): 'GBP' | 'EUR' {
  return detectRegionFromUrl() === 'UK' ? 'GBP' : 'EUR';
}

export function formatMoney(value: number): string {
  const region = detectRegionFromUrl();
  const locale = region === 'UK' ? 'en-GB' : 'en-IE';
  const iso = region === 'UK' ? 'GBP' : 'EUR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: iso,
    maximumFractionDigits: 0
  }).format(value);
}
