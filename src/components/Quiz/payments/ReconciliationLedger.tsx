// src/components/Quiz/payments/ReconciliationLedger.tsx
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Plus, Trash2 } from 'lucide-react';

const TYPE_OPTIONS = [
  'received',         // + extra money in (donations, late payments)
  'refund',           // - out
  'fee',              // - bank/processing fee
  'cash_over_short',  // +/- depending on reason
  'prize_payout',     // - prize paid from takings
] as const;

const METHOD_OPTIONS = [
  'cash',
  'tap',
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

  const patchRow = (row: any, patch: any) => {
    updateItem(row.id, patch);
  };

  const deleteItem = (id: string) => {
    if (!socket || !roomId || approvedAt) return;
    const next = ledger.filter((l) => l.id !== id);
    socket.emit('update_reconciliation', { roomId, patch: { ledger: next } });
  };

  // constrain reasons depending on type
  const reasonsForType = (type: TypeOpt): ReasonOpt[] => {
    if (type === 'cash_over_short') return ['cash_over','cash_short'] as ReasonOpt[];
    if (type === 'prize_payout')   return ['prize_award_delivered'] as ReasonOpt[];
    if (type === 'refund')         return ['refund','method_mismatch','data_entry_error','other'] as ReasonOpt[];
    if (type === 'fee')            return ['data_entry_error','method_mismatch','other'] as ReasonOpt[];
    // received
    return ['late_payment','complimentary','data_entry_error','method_mismatch','other'] as ReasonOpt[];
  };

  // totals for mini row: increases / reductions / net
  const totals = useMemo(() => {
    let increases = 0, reductions = 0;
    for (const l of ledger) {
      const amt = Number(l.amount || 0);
      switch (l.type) {
        case 'received':
          increases += amt;
          break;
        case 'refund':
          reductions += amt;
          break;
        case 'fee':
          reductions += amt;
          break;
        case 'prize_payout':
          reductions += amt;
          break;
        case 'cash_over_short':
          if (l.reasonCode === 'cash_over') increases += amt;
          else if (l.reasonCode === 'cash_short') reductions += amt;
          break;
        default:
          break;
      }
    }
    return { increases, reductions, net: increases - reductions };
  }, [ledger]);

  // auto-fix reason defaults when type changes
  const onTypeChange = (row: any, nextType: TypeOpt) => {
    const allowed = reasonsForType(nextType);
    const nextReason = allowed.includes(row.reasonCode) ? row.reasonCode : allowed[0];
    // clear prize link if leaving prize_payout
    const nextMeta = nextType === 'prize_payout' ? row.meta || {} : { ...(row.meta || {}), prizeAwardId: undefined };
    patchRow(row, { type: nextType, reasonCode: nextReason, meta: nextMeta });
  };

  const prizeLabel = (a: AwardLite) => {
    const place = typeof a.place === 'number' ? `Place ${a.place}` : 'Prize';
    const name = a.prizeName || 'Untitled';
    const val  = typeof a.prizeValue === 'number' ? `${currency}${a.prizeValue.toFixed(2)}` : `${currency}0.00`;
    return `${place} — ${name} (${val})`;
  };

  const onPrizeSelect = (row: any, prizeAwardId: string) => {
    const currentAmount = Number(row.amount || 0);
    const selected = awards.find((a) => a.prizeAwardId === prizeAwardId);
    const patch: any = { meta: { ...(row.meta || {}), prizeAwardId } };
    if (currentAmount === 0 && typeof selected?.prizeValue === 'number') {
      patch.amount = selected.prizeValue;
    }
    patchRow(row, patch);
  };

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Adjustments Ledger</h3>
        <button
          onClick={addItem}
          disabled={!!approvedAt}
          className="flex items-center space-x-2 rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          <span>Add Adjustment</span>
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-2">When</th>
              <th className="border px-2 py-2">Type</th>
              <th className="border px-2 py-2">Method</th>
              <th className="border px-2 py-2">Amount</th>
              <th className="border px-2 py-2">Reason</th>
              <th className="border px-2 py-2">Linked Prize</th>
              <th className="border px-2 py-2">Note</th>
              <th className="border px-2 py-2">By</th>
              <th className="border px-2 py-2 w-10"> </th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 && (
              <tr><td className="border px-2 py-3 text-fg/60" colSpan={9}>No adjustments yet.</td></tr>
            )}
            {ledger.map((l) => {
              const allowedReasons = reasonsForType(l.type as TypeOpt);
              const method = (METHOD_OPTIONS as readonly string[]).includes(l.method) ? l.method : 'other';
              const isPrize = l.type === 'prize_payout';
              const linkedPrizeId: string | undefined = l.meta?.prizeAwardId;

              return (
                <tr key={l.id}>
                  <td className="border px-2 py-2">{new Date(l.ts).toLocaleString()}</td>

                  <td className="border px-2 py-2">
                    <select
                      disabled={!!approvedAt}
                      className="rounded border bg-white px-2 py-1"
                      value={l.type}
                      onChange={(e) => onTypeChange(l, e.target.value as TypeOpt)}
                    >
                      {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>

                  <td className="border px-2 py-2">
                    <select
                      disabled={!!approvedAt}
                      className="rounded border bg-white px-2 py-1"
                      value={method}
                      onChange={(e) => patchRow(l, { method: e.target.value as MethodOpt })}
                    >
                      {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>

                  <td className="border px-2 py-2">
                    <div className="flex items-center">
                      <span className="mr-1">{currency}</span>
                      <input
                        disabled={!!approvedAt}
                        type="number"
                        step="0.01"
                        className="w-28 rounded border bg-white px-2 py-1"
                        value={l.amount}
                        onChange={(e) => patchRow(l, { amount: parseFloat(e.target.value || '0') })}
                      />
                    </div>
                  </td>

                  <td className="border px-2 py-2">
                    <select
                      disabled={!!approvedAt}
                      className="rounded border bg-white px-2 py-1"
                      value={allowedReasons.includes(l.reasonCode) ? l.reasonCode : allowedReasons[0]}
                      onChange={(e) => patchRow(l, { reasonCode: e.target.value as ReasonOpt })}
                    >
                      {allowedReasons.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>

                  {/* Linked Prize helper (only active for prize_payout) */}
                  <td className="border px-2 py-2">
                    {isPrize ? (
                      <select
                        disabled={!!approvedAt}
                        className="rounded border bg-white px-2 py-1 min-w-[14rem]"
                        value={linkedPrizeId || ''}
                        onChange={(e) => onPrizeSelect(l, e.target.value)}
                      >
                        <option value="">{awards.length ? '— Select prize —' : '— No prizes —'}</option>
                        {awards.map((a) => (
                          <option key={a.prizeAwardId} value={a.prizeAwardId}>
                            {prizeLabel(a)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="border px-2 py-2">
                    <input
                      disabled={!!approvedAt}
                      className="w-full rounded border bg-white px-2 py-1"
                      value={l.note || ''}
                      onChange={(e) => patchRow(l, { note: e.target.value })}
                    />
                  </td>

                  <td className="border px-2 py-2">{l.createdBy || '—'}</td>

                  <td className="border px-2 py-2">
                    <button
                      className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      onClick={() => deleteItem(l.id)}
                      disabled={!!approvedAt}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mini totals row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded border bg-gray-50 p-2">Increases: {currency}{totals.increases.toFixed(2)}</div>
        <div className="rounded border bg-gray-50 p-2">Reductions: {currency}{totals.reductions.toFixed(2)}</div>
        <div className="rounded border bg-gray-50 p-2">Net Adj: {currency}{totals.net.toFixed(2)}</div>
      </div>
    </div>
  );
}




