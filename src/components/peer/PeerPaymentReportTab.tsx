// src/components/peer/PeerPaymentReportTab.tsx

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import svc, {
  type PeerPaymentReport,
} from '../../services/PeerService';
import { brand } from '../dashboard/branding';

export default function PeerPaymentReportTab({
  fundraiserId,
}: {
  fundraiserId: string;
}) {
  const [report, setReport] =
    useState<PeerPaymentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    svc.paymentReport(fundraiserId)
      .then(result => {
        if (active) setReport(result);
      })
      .catch(err => {
        if (active) {
          setError(
            err?.message || 'Could not load report.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fundraiserId]);

  if (loading) {
    return (
      <div className="grid place-items-center py-14">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: brand.teal }}
        />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error || 'Report unavailable.'}
      </div>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: report.currency || 'EUR',
    }).format(Number(value || 0));

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="text-lg font-bold"
          style={{ color: brand.navy }}
        >
          Peer fundraising report
        </h3>
        <p
          className="mt-1 text-sm"
          style={{ color: brand.slate }}
        >
          Raised income includes confirmed payments only.
          Claimed manual payments are shown separately and
          do not increase the fundraiser total.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric
          label="Confirmed income"
          value={money(report.totals.confirmedTotal)}
        />
        <Metric
          label="Confirmed payments"
          value={String(report.totals.confirmedCount)}
        />
        <Metric
          label="Manual awaiting confirmation"
          value={money(report.totals.claimedTotal)}
          attention={report.totals.claimedCount > 0}
        />
        <Metric
          label="Manual claims"
          value={String(report.totals.claimedCount)}
          attention={report.totals.claimedCount > 0}
        />
        {report.type === 'sell_activities' && (
          <>
            <Metric
              label="Confirmed direct donations"
              value={money(report.totals.donationConfirmedTotal || 0)}
            />
            <Metric
              label="Donation claims awaiting confirmation"
              value={money(report.totals.donationClaimedTotal || 0)}
              attention={(report.totals.donationClaimedCount || 0) > 0}
            />
            <Metric
              label="Total confirmed peer income"
              value={money(report.totals.combinedConfirmedTotal || 0)}
            />
          </>
        )}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h4
          className="font-bold"
          style={{ color: brand.navy }}
        >
          By participant
        </h4>

        {!report.participants.length ? (
          <p
            className="mt-3 text-sm"
            style={{ color: brand.slate }}
          >
            No confirmed or claimed payments yet.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {report.participants.map((row, index) => (
              <div
                key={`${row.participantId || 'general'}-${index}`}
                className="grid grid-cols-[1fr_auto] gap-4 py-3"
              >
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: brand.navy }}
                  >
                    {row.participantName ||
                      'General fundraiser'}
                  </p>
                  {row.claimedCount > 0 && (
                    <p className="mt-1 text-xs font-semibold text-amber-700">
                      {row.claimedCount} manual payment
                      {row.claimedCount === 1 ? '' : 's'} awaiting confirmation
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-bold"
                    style={{ color: brand.navy }}
                  >
                    {money(row.confirmedTotal)}
                  </p>
                  {row.claimedTotal > 0 && (
                    <p className="mt-1 text-xs font-semibold text-amber-700">
                      + {money(row.claimedTotal)} claimed
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h4
          className="font-bold"
          style={{ color: brand.navy }}
        >
          By payment method
        </h4>

        {!report.methods.length ? (
          <p
            className="mt-3 text-sm"
            style={{ color: brand.slate }}
          >
            No confirmed or claimed payments yet.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {report.methods.map((row, index) => (
              <div
                key={`${row.methodCategory}-${row.methodLabel}-${index}`}
                className="grid grid-cols-[1fr_auto] gap-4 py-3"
              >
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: brand.navy }}
                  >
                    {row.methodLabel}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: brand.slate }}
                  >
                    {row.confirmedCount} confirmed
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-bold"
                    style={{ color: brand.navy }}
                  >
                    {money(row.confirmedTotal)}
                  </p>
                  {row.claimedTotal > 0 && (
                    <p className="mt-1 text-xs font-semibold text-amber-700">
                      {money(row.claimedTotal)} awaiting
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: attention ? '#f59e0b' : brand.border,
        background: attention ? '#fffbeb' : '#ffffff',
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wide"
        style={{
          color: attention ? '#92400e' : brand.slate,
        }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-xl font-black"
        style={{
          color: attention ? '#92400e' : brand.navy,
        }}
      >
        {value}
      </p>
    </div>
  );
}
