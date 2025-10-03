// src/components/Quiz/payments/ReconciliationLedger.tsx
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Plus, Trash2 } from 'lucide-react';

const REASON_CODES = [
  'late_payment','method_mismatch','duplicate_charge','complimentary',
  'dispute_refund','price_change','cash_over','cash_short','data_entry_error','other',
] as const;

export default function ReconciliationLedger() {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();
  const rec = (config?.reconciliation as any) || {};
  const ledger = (rec.ledger as any[]) || [];
  const approvedAt = rec.approvedAt as string | undefined;

  const currency = config?.currencySymbol || '€';

  const totals = useMemo(() => {
    let fees = 0, refunds = 0, adj = 0;
    for (const l of ledger) {
      if (l.type === 'fee') fees += l.amount;
      else if (l.type === 'refund') refunds += l.amount;
      else if (l.type !== 'received') adj += l.amount;
    }
    return { fees, refunds, adj };
  }, [ledger]);

  const addItem = () => {
    if (!socket || !roomId || approvedAt) return;
    const item = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      type: 'correction',
      method: 'other',
      payerId: undefined,
      amount: 0,
      currency: 'EUR',
      reasonCode: 'other',
      note: '',
      createdBy: config?.hostName || 'Host',
      meta: {},
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

  const deleteItem = (id: string) => {
    if (!socket || !roomId || approvedAt) return;
    const next = ledger.filter((l) => l.id !== id);
    socket.emit('update_reconciliation', { roomId, patch: { ledger: next } });
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
              <th className="border px-2 py-2">Note</th>
              <th className="border px-2 py-2">By</th>
              <th className="border px-2 py-2 w-10"> </th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 && (
              <tr><td className="border px-2 py-3 text-fg/60" colSpan={8}>No adjustments yet.</td></tr>
            )}
            {ledger.map((l) => (
              <tr key={l.id}>
                <td className="border px-2 py-2">{new Date(l.ts).toLocaleString()}</td>
                <td className="border px-2 py-2">
                  <select
                    disabled={!!approvedAt}
                    className="rounded border bg-white px-2 py-1"
                    value={l.type}
                    onChange={(e) => updateItem(l.id, { type: e.target.value })}
                  >
                    <option value="received">received</option>
                    <option value="fee">fee</option>
                    <option value="refund">refund</option>
                    <option value="writeoff">writeoff</option>
                    <option value="correction">correction</option>
                    <option value="prize_payout">prize_payout</option>
                    <option value="cash_over_short">cash_over_short</option>
                  </select>
                </td>
                <td className="border px-2 py-2">
                  <select
                    disabled={!!approvedAt}
                    className="rounded border bg-white px-2 py-1"
                    value={l.method || 'other'}
                    onChange={(e) => updateItem(l.id, { method: e.target.value })}
                  >
                    <option>cash</option>
                    <option>card</option>
                    <option>revolut</option>
                    <option>web3</option>
                    <option>other</option>
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
                      onChange={(e) => updateItem(l.id, { amount: parseFloat(e.target.value || '0') })}
                    />
                  </div>
                </td>
                <td className="border px-2 py-2">
                  <select
                    disabled={!!approvedAt}
                    className="rounded border bg-white px-2 py-1"
                    value={l.reasonCode || 'other'}
                    onChange={(e) => updateItem(l.id, { reasonCode: e.target.value })}
                  >
                    {REASON_CODES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="border px-2 py-2">
                  <input
                    disabled={!!approvedAt}
                    className="w-full rounded border bg-white px-2 py-1"
                    value={l.note || ''}
                    onChange={(e) => updateItem(l.id, { note: e.target.value })}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Mini totals row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded border bg-gray-50 p-2">Fees: {currency}{totals.fees.toFixed(2)}</div>
        <div className="rounded border bg-gray-50 p-2">Refunds: {currency}{totals.refunds.toFixed(2)}</div>
        <div className="rounded border bg-gray-50 p-2">Other Adj: {currency}{totals.adj.toFixed(2)}</div>
      </div>
    </div>
  );
}
