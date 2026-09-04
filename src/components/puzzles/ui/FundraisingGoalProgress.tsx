// src/components/puzzles/ui/FundraisingGoalProgress.tsx
//
// Shared public fundraising-goal presentation for Puzzle Subscription + Puzzle Drop.
// Intentionally data-source agnostic: the parent/public API supplies confirmed raised
// amount and the linked event goal.

interface Props {
  goalAmount?: number | string | null;
  raisedAmount?: number | string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  clubName?: string | null;
  title?: string;
  className?: string;
}

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
};

function asMoneyNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function money(
  value: number,
  currency?: string | null,
  explicitSymbol?: string | null,
) {
  const code = String(currency || 'EUR').toUpperCase();
  const symbol = explicitSymbol || SYMBOLS[code] || '';

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${symbol}${value.toLocaleString(undefined, {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M16.5 7.5 21 3m0 0h-4m4 0v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FundraisingGoalProgress({
  goalAmount,
  raisedAmount,
  currency,
  currencySymbol,
  clubName,
  title = 'Help us reach our goal',
  className = '',
}: Props) {
  const goal = asMoneyNumber(goalAmount);
  const raised = asMoneyNumber(raisedAmount);

  // No configured goal = no progress UI. This lets the same component be used
  // safely on every public puzzle page without inventing a target.
  if (goal <= 0) return null;

  const rawPercent = (raised / goal) * 100;
  const percent = Math.max(0, Math.min(100, rawPercent));
  const reached = raised >= goal;
  const overBy = reached ? Math.max(0, raised - goal) : 0;

  return (
    <section
      className={`w-full min-w-0 overflow-hidden rounded-[26px] border border-[#DDE7DA] bg-[linear-gradient(135deg,#F5F9F2_0%,#FBF8F3_100%)] p-5 shadow-sm sm:rounded-[30px] sm:p-6 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)]">
          <TargetIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8A847B] sm:text-xs">
            Fundraising goal
          </p>

          <div className="mt-1 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <h2 className="break-words font-serif text-2xl leading-tight text-[#071A44] sm:text-3xl">
              {reached ? 'Goal reached — and we’re still going' : title}
            </h2>

            <span className="shrink-0 text-sm font-black text-[var(--puzzle-primary)]">
              {Math.round(rawPercent)}%
            </span>
          </div>

          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white shadow-inner">
            <div
              className="h-full rounded-full bg-[var(--puzzle-primary)] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-black text-[#071A44] sm:text-2xl">
              {money(raised, currency, currencySymbol)}
            </span>
            <span className="text-sm font-semibold text-[#6E6A63]">
              raised of {money(goal, currency, currencySymbol)}
            </span>
          </div>

          <p className="mt-2 break-words text-xs leading-5 text-[#6E6A63] sm:text-sm">
            {reached && overBy > 0
              ? `${money(overBy, currency, currencySymbol)} beyond the target — every additional contribution still helps.`
              : `Every puzzle subscription helps ${clubName || 'the organiser'} move closer to the target.`}
          </p>
        </div>
      </div>
    </section>
  );
}