// src/components/mgtsystem/hooks/useCurrency.ts
//
// Single source of truth for currency symbol in the management dashboard.
//
// Priority order:
//   1. Club's reporting_currency from the auth store (set at registration)
//   2. currencySymbol stored in room config_json (legacy rooms)
//   3. currency ISO code stored in room config_json (older legacy)
//   4. Hard fallback '€'
//
// Usage in any tab:
//   const { sym, fmt } = useCurrency(config);
//   fmt(5.00)  →  '€5.00'

import { useAuthStore } from '../../../features/auth';

const ISO_TO_SYMBOL: Record<string, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
  CAD: 'CA$',
  NGN: '₦',
};

function isoToSymbol(code: string): string {
  return ISO_TO_SYMBOL[code] ?? code;
}

interface CurrencyUtils {
  /** Display symbol e.g. '€', '£', '$' */
  sym: string;
  /** ISO code e.g. 'EUR', 'GBP' */
  iso: string;
  /** Format a number as currency string e.g. '€5.00' */
  fmt: (n: number | null | undefined) => string;
}

/**
 * @param config  Parsed config_json from the room row — used as fallback for
 *                legacy rooms created before reporting_currency was on the club.
 */
export function useCurrency(config?: any): CurrencyUtils {
  const club = useAuthStore((s: any) => s.club);

  // 1. Club reporting_currency (ISO code)
  if (club?.reporting_currency) {
    const iso = club.reporting_currency;
    const sym = isoToSymbol(iso);
    return { sym, iso, fmt: (n) => `${sym}${Number(n ?? 0).toFixed(2)}` };
  }

  // 2. Legacy: symbol already stored in config
  if (config?.currencySymbol) {
    const sym = config.currencySymbol;
    return { sym, iso: sym, fmt: (n) => `${sym}${Number(n ?? 0).toFixed(2)}` };
  }

  // 3. Legacy: ISO code stored in config
  if (config?.currency) {
    const sym = isoToSymbol(config.currency);
    return { sym, iso: config.currency, fmt: (n) => `${sym}${Number(n ?? 0).toFixed(2)}` };
  }

  // 4. Hard fallback
  return { sym: '€', iso: 'EUR', fmt: (n) => `€${Number(n ?? 0).toFixed(2)}` };
}