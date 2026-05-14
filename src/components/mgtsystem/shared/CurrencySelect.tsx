// src/components/mgtsystem/components/shared/CurrencySelect.tsx
//
// Shared currency selector used by scheduling modals (quiz + elimination).
// Derives options from the same list used by currencyUtils.js on the backend.

interface CurrencyOption {
  code:   string;
  symbol: string;
  label:  string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'EUR', symbol: '€',   label: 'Euro (EUR)'               },
  { code: 'GBP', symbol: '£',   label: 'British Pound (GBP)'      },
  { code: 'USD', symbol: '$',   label: 'US Dollar (USD)'          },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar (CAD)'    },
  { code: 'NGN', symbol: '₦',   label: 'Nigerian Naira (NGN)'     },
];

export function currencySymbol(code: string): string {
  return CURRENCY_OPTIONS.find(c => c.code === code)?.symbol ?? code;
}

interface Props {
  value:     string;
  onChange:  (code: string) => void;
  disabled?: boolean;
  id?:       string;
  className?: string;
}

export default function CurrencySelect({ value, onChange, disabled, id, className }: Props) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className={
        className ??
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400'
      }
    >
      {CURRENCY_OPTIONS.map(c => (
        <option key={c.code} value={c.code}>
          {c.symbol} — {c.label}
        </option>
      ))}
    </select>
  );
}