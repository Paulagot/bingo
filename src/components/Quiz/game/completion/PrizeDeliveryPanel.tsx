import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';
import { useQuizConfig } from '../../hooks/useQuizConfig';
import { 
  CheckCircle2, 
  RotateCcw, 
  Truck, 
  Ban, 
  PackageCheck, 
  HelpCircle, 
  ClipboardCopy,
  Package,
  AlertCircle
} from 'lucide-react';

type Award = {
  prizeAwardId: string;
  prizeId?: string | number;
  prizeName?: string;
  prizeValue?: number | null;
  sponsor?: string | null;
  place?: number;
  winnerPlayerId?: string;
  winnerName?: string;
  status: 'declared' | 'delivered' | 'unclaimed' | 'refused' | 'returned' | 'canceled';
  declaredAt?: string;
  deliveredAt?: string;
  statusHistory?: Array<{ status: Award['status']; at: string; by?: string }>;
  awardMethod?: string;      // collection | delivery
  awardReference?: string;
  awardNotes?: string;
  winnerConfirmed?: boolean; // NEW: compliance tick (got it confirmed)
};

const FINAL_STATES = new Set(['delivered', 'unclaimed', 'refused', 'returned', 'canceled']);

const METHOD_OPTIONS = [
  { value: '', label: '— Select method —' },
  { value: 'collection', label: 'Collection (in-person)' },
  { value: 'delivery', label: 'Delivery (postal/courier)' },
];

type Props = {
  lockEdits?: boolean;
};

export default function PrizeDeliveryPanel({ lockEdits = false }: Props) {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();
  const hostName = config?.hostName || 'Host';
  const currency = config?.currencySymbol || '€';

  const prizes = (config?.prizes || []) as any[];
  const awards = ((config?.reconciliation as any)?.prizeAwards || []) as Award[];

  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, number | null>>({});

  const sortedAwards = useMemo(() => {
    const copy = [...awards];
    copy.sort((a, b) => {
      const pa = a.place || 9999;
      const pb = b.place || 9999;
      if (pa !== pb) return pa - pb;
      const na = (a.prizeName || '').toLowerCase();
      const nb = (b.prizeName || '').toLowerCase();
      return na.localeCompare(nb);
    });
    return copy;
  }, [awards]);

  useEffect(() => {
    if (!socket) return;
    const onReconUpdate = () => setUpdating(new Set());
    socket.on('reconciliation_updated', onReconUpdate);
    return () => {
      socket.off('reconciliation_updated', onReconUpdate);
    };
  }, [socket]);

  const queueAwardFieldPatch = (
    awardId: string,
    patchFields: Partial<Omit<Award, 'status' | 'statusHistory' | 'deliveredAt'>>
  ) => {
    if (!socket || !roomId) return;
    if (saveTimers.current[awardId]) window.clearTimeout(saveTimers.current[awardId]!);
    saveTimers.current[awardId] = window.setTimeout(() => {
      const nextAwards: Award[] = awards.map((a): Award =>
        a.prizeAwardId === awardId ? ({ ...a, ...patchFields } as Award) : a
      );
      socket.emit('update_reconciliation', {
        roomId,
        patch: { prizeAwards: nextAwards },
      });
    }, 250);
  };

  const emitAwardsOnly = (nextAwards: Award[]) => {
    if (!socket || !roomId) return;
    socket.emit('update_reconciliation', { roomId, patch: { prizeAwards: nextAwards } });
  };

  const handleStatusChange = (award: Award, nextStatus: Award['status']) => {
    if (lockEdits) return;

    if (nextStatus === 'delivered') {
      // Require delivery method and winner confirmation
      if (!award.awardMethod) {
        setErrors((prev) => ({ ...prev, [award.prizeAwardId]: 'Select a delivery method first.' }));
        return;
      }
      if (!award.winnerConfirmed) {
        setErrors((prev) => ({ ...prev, [award.prizeAwardId]: 'Confirm winner receipt before marking delivered.' }));
        return;
      }
    }

    setErrors((prev) => ({ ...prev, [award.prizeAwardId]: null }));
    const now = new Date().toISOString();
    const nextAwards: Award[] = awards.map((a): Award => {
      if (a.prizeAwardId !== award.prizeAwardId) return a;
      const hist = Array.isArray(a.statusHistory) ? [...a.statusHistory] : [];
      hist.push({ status: nextStatus, at: now, by: hostName });

      const updated: Award = {
        ...a,
        status: nextStatus,
        statusHistory: hist,
        ...(nextStatus === 'delivered' ? { deliveredAt: now } : {}),
      };
      return updated;
    });

    setUpdating((prev) => new Set(prev).add(award.prizeAwardId));
    // No auto-ledger emit here; prize payout will be booked in the Reconciliation Ledger by treasurer.
    emitAwardsOnly(nextAwards);
  };

  const handleReopen = (award: Award) => {
    if (lockEdits) return;
    const now = new Date().toISOString();

    const nextAwards: Award[] = awards.map((a): Award => {
      if (a.prizeAwardId !== award.prizeAwardId) return a;
      const hist = Array.isArray(a.statusHistory) ? [...a.statusHistory] : [];
      hist.push({ status: 'declared' as Award['status'], at: now, by: hostName });

      return { ...a, status: 'declared' as Award['status'], statusHistory: hist };
    });

    setUpdating((prev) => new Set(prev).add(award.prizeAwardId));
    // No ledger adjustment on reopen (correction type removed).
    emitAwardsOnly(nextAwards);
  };

  const copyToClipboard = (text: string, awardId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(awardId);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  if (!prizes?.length) {
    return null;
  }

  if (!awards?.length) {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 mb-1">No Prize Awards Yet</h4>
            <p className="text-sm text-amber-800">Use "Assign Winners" section above to declare prize recipients first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-purple-100 p-2">
          <Package className="h-5 w-5 text-purple-700" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Delivery & Compliance</h3>
          <p className="text-sm text-gray-600">Record method, confirmation, value, and notes</p>
        </div>
      </div>

      {/* Award Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedAwards.map((a) => {
          const busy = updating.has(a.prizeAwardId);
          const final = FINAL_STATES.has(a.status);
          const err = errors[a.prizeAwardId] || null;
          const isCopied = copiedRef === a.prizeAwardId;

          const value = typeof a.prizeValue === 'number' ? a.prizeValue : 0;

          return (
            <div
              key={a.prizeAwardId}
              className={`rounded-lg border-2 bg-white p-4 transition-all ${
                final
                  ? a.status === 'delivered'
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-gray-200 bg-gray-50'
                  : 'border-purple-200 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-3 pb-3 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-xs font-bold">
                      {a.place || '?'}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{a.prizeName || 'Untitled Prize'}</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {a.sponsor && <div>Sponsor: <span className="text-purple-600 font-medium">{a.sponsor}</span></div>}
                    <div>Value: <span className="font-medium">{currency}{value.toFixed(2)}</span></div>
                    <div>Winner: <span className="font-medium text-blue-700">{a.winnerName || '—'}</span></div>
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                      a.status === 'delivered'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : a.status === 'declared'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              </div>

              {/* Method / Value / Reference / Notes / Winner Confirmed */}
              <div className="mb-3 space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Delivery Method
                  </label>
                  <select
                    disabled={lockEdits || final}
                    className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    value={a.awardMethod || ''}
                    onChange={(e) => queueAwardFieldPatch(a.prizeAwardId, { awardMethod: e.target.value })}
                  >
                    {METHOD_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Value
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{currency}</span>
                    <input
                      disabled={lockEdits || final}
                      type="number"
                      step="0.01"
                      className="w-36 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      value={(a.prizeValue ?? 0)}
                      onChange={(e) => queueAwardFieldPatch(a.prizeAwardId, { prizeValue: parseFloat(e.target.value || '0') })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id={`winner-confirmed-${a.prizeAwardId}`}
                    type="checkbox"
                    disabled={lockEdits || final}
                    className="h-4 w-4"
                    checked={!!a.winnerConfirmed}
                    onChange={(e) => queueAwardFieldPatch(a.prizeAwardId, { winnerConfirmed: e.target.checked })}
                  />
                  <label htmlFor={`winner-confirmed-${a.prizeAwardId}`} className="text-sm text-gray-700">
                    Winner confirmed receipt
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Reference / Receipt / TX
                  </label>
                  <div className="flex gap-2">
                    <input
                      disabled={lockEdits || (final && a.status !== 'delivered')}
                      className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      value={a.awardReference || ''}
                      onChange={(e) => queueAwardFieldPatch(a.prizeAwardId, { awardReference: e.target.value })}
                      placeholder="e.g. CASH-001, REV-xyz, postal ref…"
                    />
                    <button
                      type="button"
                      className="rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-40"
                      onClick={() => copyToClipboard(a.awardReference || '', a.prizeAwardId)}
                      disabled={!a.awardReference}
                      title="Copy reference"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </button>
                  </div>
                  {isCopied && (
                    <div className="mt-1.5 text-xs text-green-600 font-medium">Copied!</div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </label>
                  <textarea
                    disabled={lockEdits || (final && a.status !== 'delivered')}
                    rows={2}
                    className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all resize-none"
                    value={a.awardNotes || ''}
                    onChange={(e) => queueAwardFieldPatch(a.prizeAwardId, { awardNotes: e.target.value })}
                    placeholder="Any delivery notes or exceptions…"
                  />
                </div>
              </div>

              {/* Error Display */}
              {err && (
                <div className="mb-3 rounded-lg bg-amber-50 border border-amber-300 p-2.5 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                  <span className="text-xs font-medium text-amber-800">{err}</span>
                </div>
              )}

              {/* Actions */}
              {final ? (
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Finalized</span>
                    {a.deliveredAt && (
                      <span className="ml-1">on {new Date(a.deliveredAt).toLocaleString()}</span>
                    )}
                  </div>
                  {!lockEdits && (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-40"
                      onClick={() => handleReopen(a)}
                      disabled={busy}
                      title="Reopen to edit"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reopen
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 active:bg-green-800 transition-all shadow-sm ${
                        (!a.awardMethod || !a.winnerConfirmed || lockEdits) ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                      onClick={() => handleStatusChange(a, 'delivered')}
                      disabled={busy || lockEdits || !a.awardMethod || !a.winnerConfirmed}
                      title={!a.awardMethod ? 'Select delivery method' : !a.winnerConfirmed ? 'Confirm winner receipt' : 'Mark Delivered'}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Delivered
                    </button>

                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-40"
                      onClick={() => handleStatusChange(a, 'unclaimed')}
                      disabled={busy || lockEdits}
                      title="Winner didn't collect"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Unclaimed
                    </button>

                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-40"
                      onClick={() => handleStatusChange(a, 'refused')}
                      disabled={busy || lockEdits}
                      title="Winner refused the prize"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Refused
                    </button>

                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-40"
                      onClick={() => handleStatusChange(a, 'returned')}
                      disabled={busy || lockEdits}
                      title="Prize returned to sponsor/stock"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      Returned
                    </button>

                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-40"
                      onClick={() => handleStatusChange(a, 'canceled')}
                      disabled={busy || lockEdits}
                      title="Cancel this award"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* History */}
              {Array.isArray(a.statusHistory) && a.statusHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Status History</div>
                  <div className="space-y-1.5">
                    {a.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">{h.status}</span>
                          <span className="mx-1.5">•</span>
                          <span>{new Date(h.at).toLocaleString()}</span>
                          {h.by && (
                            <>
                              <span className="mx-1.5">•</span>
                              <span className="text-purple-600">{h.by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


