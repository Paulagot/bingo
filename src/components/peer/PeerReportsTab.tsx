// src/components/peer/PeerReportsTab.tsx
//
// Rebuilt reports tab. Replaces the old PeerReportsTab.tsx.
// Uses PeerPaymentReport (from paymentReport endpoint) as the primary source
// and falls back gracefully when data is sparse.
// Sections:
//   1. Summary stat cards (confirmed, claimed, combined)
//   2. Progress bar vs target (if target set)
//   3. By participant
//   4. By payment method
//   5. By pack (sell_activities only, from PeerReport.packTotals)

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import svc from '../../services/PeerService';
import type { PeerPaymentReport, PeerReport } from '../../services/PeerService';
import { brand } from '../dashboard/branding';

interface Props {
  fundraiserId: string;
  currency:     string;
  targetAmount: number;
}

export default function PeerReportsTab({ fundraiserId, currency, targetAmount }: Props) {
  const [paymentReport, setPaymentReport] = useState<PeerPaymentReport | null>(null);
  const [packReport,    setPackReport]    = useState<PeerReport | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      svc.paymentReport(fundraiserId),
      svc.report(fundraiserId),
    ])
      .then(([pr, rr]) => {
        if (!active) return;
        setPaymentReport(pr);
        setPackReport(rr);
      })
      .catch(err => {
        if (active) setError(err?.message || 'Could not load report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [fundraiserId]);

  if (loading) {
    return (
      <div className="grid place-items-center py-14">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: brand.teal }} />
      </div>
    );
  }

  if (error || !paymentReport) {
    return (
      <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error || 'Report unavailable.'}
      </div>
    );
  }

  const cur = paymentReport.currency || currency || 'EUR';
  const money = (v: number) =>
    new Intl.NumberFormat(undefined, {
      style:    'currency',
      currency: cur,
      maximumFractionDigits: 2,
    }).format(Number(v || 0));

  const { totals } = paymentReport;
  const confirmed  = totals.confirmedTotal;
  const claimed    = totals.claimedTotal;
  const combined   = totals.combinedConfirmedTotal ?? confirmed;
  const progress   = targetAmount > 0 ? Math.min(100, Math.round((confirmed / targetAmount) * 100)) : null;

  return (
    <div className="space-y-8">

      {/* ── 1. Summary cards ─────────────────────────────────────────── */}
      <section>
        <SectionLabel>Summary</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Confirmed income"
            value={money(confirmed)}
            sub={`${totals.confirmedCount} payment${totals.confirmedCount === 1 ? '' : 's'}`}
          />
          <StatCard
            label="Manual awaiting confirmation"
            value={money(claimed)}
            sub={`${totals.claimedCount} pending`}
            attention={totals.claimedCount > 0}
          />
          {paymentReport.type === 'sell_activities' && (
            <>
              <StatCard
                label="Confirmed direct donations"
                value={money(totals.donationConfirmedTotal ?? 0)}
                sub={`${totals.donationConfirmedCount ?? 0} donation${(totals.donationConfirmedCount ?? 0) === 1 ? '' : 's'}`}
              />
              <StatCard
                label="Donation claims pending"
                value={money(totals.donationClaimedTotal ?? 0)}
                sub={`${totals.donationClaimedCount ?? 0} awaiting`}
                attention={(totals.donationClaimedCount ?? 0) > 0}
              />
              <StatCard
                label="Total confirmed (sales + donations)"
                value={money(combined)}
                highlight
              />
            </>
          )}
        </div>
      </section>

      {/* ── 2. Progress vs target ─────────────────────────────────────── */}
      {targetAmount > 0 && (
        <section>
          <SectionLabel>Progress towards target</SectionLabel>
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: brand.border, background: '#fff' }}
          >
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-2xl font-black" style={{ color: brand.navy }}>{money(confirmed)}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: brand.slate }}>
                  raised of {money(targetAmount)} target
                </p>
              </div>
              <p className="text-2xl font-black" style={{ color: brand.teal }}>{progress}%</p>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: brand.bg }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: brand.teal }}
              />
            </div>
            {totals.claimedTotal > 0 && (
              <p className="mt-2 text-xs font-semibold" style={{ color: '#92400e' }}>
                +{money(claimed)} in manual payments awaiting confirmation
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── 3. By participant ─────────────────────────────────────────── */}
      {(paymentReport.participants ?? []).length > 0 && (
        <section>
          <SectionLabel>By participant</SectionLabel>
          <div
            className="rounded-2xl border bg-white divide-y"
            style={{ borderColor: brand.border, '--tw-divide-opacity': 1 } as any}
          >
            {(paymentReport.participants ?? []).map((row, i) => (
              <div
                key={`${row.participantId ?? 'general'}-${i}`}
                className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>
                    {row.participantName || 'General fundraiser'}
                  </p>
                  {row.claimedCount > 0 && (
                    <p className="mt-0.5 text-xs font-semibold text-amber-700">
                      {row.claimedCount} manual payment{row.claimedCount === 1 ? '' : 's'} pending
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>
                    {money(row.confirmedTotal)}
                  </p>
                  {row.claimedTotal > 0 && (
                    <p className="mt-0.5 text-xs font-semibold text-amber-700">
                      + {money(row.claimedTotal)} claimed
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. By payment method ──────────────────────────────────────── */}
      {(paymentReport.methods ?? []).length > 0 && (
        <section>
          <SectionLabel>By payment method</SectionLabel>
          <div
            className="rounded-2xl border bg-white divide-y"
            style={{ borderColor: brand.border } as any}
          >
            {(paymentReport.methods ?? []).map((row, i) => (
              <div
                key={`${row.methodCategory}-${row.methodLabel}-${i}`}
                className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>{row.methodLabel}</p>
                  <p className="mt-0.5 text-xs" style={{ color: brand.slate }}>
                    {row.confirmedCount} confirmed
                    {row.claimedCount > 0 ? `, ${row.claimedCount} pending` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>
                    {money(row.confirmedTotal)}
                  </p>
                  {row.claimedTotal > 0 && (
                    <p className="mt-0.5 text-xs font-semibold text-amber-700">
                      {money(row.claimedTotal)} awaiting
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. By pack (sell_activities only) ────────────────────────── */}
      {paymentReport.type === 'sell_activities' &&
        packReport &&
        (packReport.packTotals ?? []).length > 0 && (
        <section>
          <SectionLabel>Sales by option</SectionLabel>
          <div
            className="rounded-2xl border bg-white divide-y"
            style={{ borderColor: brand.border } as any}
          >
            {(packReport.packTotals ?? []).map(row => (
              <div
                key={row.pack_id}
                className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>{row.pack_name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: brand.slate }}>
                    {row.quantity_sold} sold
                  </p>
                </div>
                <p className="text-sm font-bold self-center" style={{ color: brand.navy }}>
                  {money(row.confirmed_total)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nothing at all */}
      {(paymentReport.participants ?? []).length === 0 &&
        (paymentReport.methods ?? []).length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: brand.slate }}>
          No confirmed or claimed payments yet.
        </p>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: brand.slate }}
    >
      {children}
    </p>
  );
}

function StatCard({
  label,
  value,
  sub,
  attention = false,
  highlight = false,
}: {
  label:      string;
  value:      string;
  sub?:       string;
  attention?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: attention ? '#f59e0b' : highlight ? brand.teal : brand.border,
        background:  attention ? '#fffbeb' : highlight ? 'rgba(21,127,133,0.06)' : '#ffffff',
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: attention ? '#92400e' : highlight ? brand.teal : brand.slate }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-xl font-black"
        style={{ color: attention ? '#92400e' : highlight ? brand.teal : brand.navy }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-0.5 text-xs font-semibold"
          style={{ color: attention ? '#92400e' : brand.slate }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}