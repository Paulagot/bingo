// ProgressBars.tsx
// Personal + overall fundraising progress. With a participant present it shows
// their personal bar prominently and the fundraiser-wide bar as a slim line
// beneath ("part of the whole campaign"); at club level it shows just the one
// overall bar. Reads the dual totals the backend now returns
// (participant.raisedAmount scoped, fundraiser.raisedAmount overall).

import { fmt } from './peerSupporthelpers';

type Track = { raised: number; target: number };

function pct({ raised, target }: Track): number {
  if (!(target > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((raised / target) * 100)));
}

type Props = {
  currency: string;
  personal?: { name?: string | null; raised: number; target: number } | null;
  overall: { label: string; raised: number; target: number };
};

export default function ProgressBars({ currency, personal, overall }: Props) {
  const hasPersonal = !!personal && (personal.target > 0 || personal.raised > 0);

  return (
    <div>
      {hasPersonal && personal && (
        <div>
          <div className="flex items-center justify-between text-sm font-bold">
            <span>
              <span className="text-[var(--fr-primary)]">{fmt(personal.raised, currency)}</span> raised
            </span>
            {personal.target > 0 && (
              <span className="text-slate-500">Target: {fmt(personal.target, currency)}</span>
            )}
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--fr-primary)] transition-all"
              style={{ width: `${pct(personal)}%` }}
            />
          </div>
          {personal.target > 0 && (
            <div className="mt-1 text-right text-xs font-black text-[var(--fr-primary)]">
              {pct(personal)}%
            </div>
          )}
        </div>
      )}

      {(overall.target > 0 || overall.raised > 0) && (
        <div className={hasPersonal ? 'mt-3 border-t border-slate-100 pt-3' : ''}>
          {hasPersonal ? (
            <>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="truncate">{overall.label}</span>
                <span className="shrink-0">
                  {fmt(overall.raised, currency)}
                  {overall.target > 0 ? ` of ${fmt(overall.target, currency)}` : ''} overall
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-400 transition-all"
                  style={{ width: `${pct(overall)}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm font-bold">
                <span>
                  <span className="text-[var(--fr-primary)]">{fmt(overall.raised, currency)}</span> raised
                </span>
                {overall.target > 0 && (
                  <span className="text-slate-500">Target: {fmt(overall.target, currency)}</span>
                )}
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--fr-primary)] transition-all"
                  style={{ width: `${pct(overall)}%` }}
                />
              </div>
              {overall.target > 0 && (
                <div className="mt-1 text-right text-xs font-black text-[var(--fr-primary)]">
                  {pct(overall)}%
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}