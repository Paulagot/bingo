// src/components/Quiz/payments/ReconciliationLedger.tsx
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Plus, Trash2, Info } from 'lucide-react';

const TYPE_OPTIONS = [
  'received',
  'refund',
  'fee',
  'cash_over_short',
  'prize_payout',
] as const;

const METHOD_OPTIONS = [
  'cash',
  'card',
  'instant_payment',
  'web3',
  'other',
] as const;

const REASON_OPTIONS = [
  'complimentary',
  'cash_over',
  'cash_short',
  'late_payment',
  'refund',
  'prize_award_delivered',
  'data_entry_error',
  'method_mismatch',
  'other',
] as const;

type TypeOpt = typeof TYPE_OPTIONS[number];
type MethodOpt = typeof METHOD_OPTIONS[number];
type ReasonOpt = typeof REASON_OPTIONS[number];

type AwardLite = {
  prizeAwardId: string;
  prizeName?: string;
  prizeValue?: number | null;
  place?: number;
  status?: string;
};

export default function ReconciliationLedger() {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();
  const rec = (config?.reconciliation as any) || {};
  const ledger = (rec.ledger as any[]) || [];
  const approvedAt = rec.approvedAt as string | undefined;

  const currency = config?.currencySymbol || '€';
  const awards = ((rec.prizeAwards || []) as AwardLite[]) || [];

  const addItem = () => {
    if (!socket || !roomId || approvedAt) return;
    const item = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      type: 'received' as TypeOpt,
      method: 'cash' as MethodOpt,
      payerId: undefined,
      amount: 0,
      currency: 'EUR',
      reasonCode: 'late_payment' as ReasonOpt,
      note: '',
      createdBy: config?.hostName || 'Host',
      meta: {} as Record<string, any>,
    };
    socket.emit('update_reconciliation', {
      roomId,
      patch: { ledger: [...ledger, item] },
    });
  };

  const updateItem = (id: string, patch: any) => {
    if (!socket || !roomId || approvedAt) return;
    const next = ledger.map((l) => (l.id === id ? { ...l, ...patch } : l));
    socket.emit('update_reconciliation', { roomId, patch: { ledger: next } });
  };

  const patchRow = (row: any, patch: any) => updateItem(row.id, patch);

  const deleteItem = (id: string) => {
    if (!socket || !roomId || approvedAt) return;
    const next = ledger.filter((l) => l.id !== id);
    socket.emit('update_reconciliation', { roomId, patch: { ledger: next } });
  };

  const reasonsForType = (type: TypeOpt): ReasonOpt[] => {
    if (type === 'cash_over_short') return ['cash_over', 'cash_short'];
    if (type === 'prize_payout') return ['prize_award_delivered'];
    if (type === 'refund') return ['refund', 'method_mismatch', 'data_entry_error', 'other'];
    if (type === 'fee') return ['data_entry_error', 'method_mismatch', 'other'];
    return ['late_payment', 'complimentary', 'data_entry_error', 'method_mismatch', 'other'];
  };

  const totals = useMemo(() => {
    let increases = 0,
      reductions = 0;
    for (const l of ledger) {
      const amt = Number(l.amount || 0);
      switch (l.type) {
        case 'received':
          increases += amt;
          break;
        case 'refund':
        case 'fee':
        case 'prize_payout':
          reductions += amt;
          break;
        case 'cash_over_short':
          if (l.reasonCode === 'cash_over') increases += amt;
          else if (l.reasonCode === 'cash_short') reductions += amt;
          break;
      }
    }
    return { increases, reductions, net: increases - reductions };
  }, [ledger]);

  const onTypeChange = (row: any, nextType: TypeOpt) => {
    const allowed = reasonsForType(nextType);
    const nextReason = allowed.includes(row.reasonCode)
      ? row.reasonCode
      : allowed[0];

    const nextMeta =
      nextType === 'prize_payout'
        ? row.meta || {}
        : { ...(row.meta || {}), prizeAwardId: undefined };

    patchRow(row, { type: nextType, reasonCode: nextReason, meta: nextMeta });
  };

  const prizeLabel = (a: AwardLite) => {
    const place = typeof a.place === 'number' ? `Place ${a.place}` : 'Prize';
    const name = a.prizeName || 'Untitled';
    const val =
      typeof a.prizeValue === 'number'
        ? `${currency}${a.prizeValue.toFixed(2)}`
        : `${currency}0.00`;
    return `${place} — ${name} (${val})`;
  };

  const onPrizeSelect = (row: any, prizeAwardId: string) => {
    const selected = awards.find((a) => a.prizeAwardId === prizeAwardId);

    const patch: any = {
      meta: { ...(row.meta || {}), prizeAwardId },
    };

    if (Number(row.amount || 0) === 0 && typeof selected?.prizeValue === 'number') {
      patch.amount = selected.prizeValue;
    }

    patchRow(row, patch);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">

      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Transaction Ledger</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Record financial adjustments after initial collection
          </p>
        </div>

        <button
          onClick={addItem}
          disabled={!!approvedAt}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Empty State */}
      {ledger.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No adjustments recorded yet</p>
          <p className="text-xs mt-1">Click "Add Entry" to add one</p>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {ledger.map((l) => {
            const allowedReasons = reasonsForType(l.type);
            const isPrize = l.type === 'prize_payout';
            const linkedPrizeId: string | undefined = l.meta?.prizeAwardId;

            return (
              <div
                key={l.id}
                className="rounded-lg border border-gray-200 p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                {/* ROW 1 — compact fields */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">

                  {/* Date */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Date/Time</div>
                    <div className="text-xs text-gray-700 whitespace-nowrap">
                      {new Date(l.ts).toLocaleString()}
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Type</div>
                    <select
                      disabled={!!approvedAt}
                      className="w-full mt-1 text-sm rounded border border-gray-300 bg-white px-2 py-1"
                      value={l.type}
                      onChange={(e) => onTypeChange(l, e.target.value as TypeOpt)}
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Method */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Method</div>
                    <select
                      disabled={!!approvedAt}
                      className="w-full mt-1 text-sm rounded border border-gray-300 bg-white px-2 py-1"
                      value={l.method}
                      onChange={(e) => patchRow(l, { method: e.target.value as MethodOpt })}
                    >
                      {METHOD_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Amount</div>
                    <div className="flex items-center mt-1">
                      <span className="mr-1 text-gray-600">{currency}</span>
                      <input
                        disabled={!!approvedAt}
                        type="number"
                        step="0.01"
                        className="w-20 text-sm rounded border border-gray-300 bg-white px-2 py-1"
                        value={l.amount}
                        onChange={(e) =>
                          patchRow(l, { amount: parseFloat(e.target.value || '0') })
                        }
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Reason</div>
                    <select
                      disabled={!!approvedAt}
                      className="w-full mt-1 text-sm rounded border border-gray-300 bg-white px-2 py-1"
                      value={
                        allowedReasons.includes(l.reasonCode)
                          ? l.reasonCode
                          : allowedReasons[0]
                      }
                      onChange={(e) => patchRow(l, { reasonCode: e.target.value as ReasonOpt })}
                    >
                      {allowedReasons.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end">
                    <button
                      className="rounded p-2 text-red-600 hover:bg-red-100"
                      onClick={() => deleteItem(l.id)}
                      disabled={!!approvedAt}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ROW 2 — prize + note + createdBy */}
                <div className="mt-4 space-y-3">

                  {/* Prize Link */}
                  {isPrize && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Prize Link</div>
                      <select
                        disabled={!!approvedAt}
                        className="mt-1 text-sm rounded border border-gray-300 bg-white px-2 py-1 w-full"
                        value={linkedPrizeId || ''}
                        onChange={(e) => onPrizeSelect(l, e.target.value)}
                      >
                        <option value="">
                          {awards.length ? '— Select prize —' : '— No prizes —'}
                        </option>
                        {awards.map((a) => (
                          <option key={a.prizeAwardId} value={a.prizeAwardId}>
                            {prizeLabel(a)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Note</div>
                    <textarea
                      disabled={!!approvedAt}
                      className="w-full mt-1 text-sm rounded border border-gray-300 bg-white px-2 py-2"
                      value={l.note || ''}
                      rows={2}
                      onChange={(e) => patchRow(l, { note: e.target.value })}
                      placeholder="Optional note..."
                    />
                  </div>

                  {/* Created By */}
                  <div className="text-right text-xs text-gray-600 pr-1">
                    By: {l.createdBy || '—'}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Totals */}
          <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="text-xs font-medium text-green-700 mb-1">Money In</div>
              <div className="text-lg font-bold text-green-900">
                {currency}{totals.increases.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Money Out</div>
              <div className="text-lg font-bold text-red-900">
                {currency}{totals.reductions.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="text-xs font-medium text-blue-700 mb-1">Net Adjustment</div>
              <div
                className={`text-lg font-bold ${
                  totals.net >= 0 ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {totals.net >= 0 ? '+' : ''}
                {currency}{totals.net.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





