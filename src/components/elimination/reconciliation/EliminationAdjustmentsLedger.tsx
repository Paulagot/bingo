// src/components/Elimination/reconciliation/EliminationAdjustmentsLedger.tsx
//
// Manual adjustment ledger. Saves to DB via socket on blur (text/number fields)
// or on change (selects). Uses a timeout fallback so the spinner never hangs
// if the socket doesn't support acknowledgement callbacks.

import React, { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Info, Loader2 } from 'lucide-react';

const ADJUSTMENT_TYPES = ['received', 'refund', 'fee', 'cash_over_short', 'prize_payout'] as const;
const PAYMENT_METHODS  = ['cash', 'card', 'card_tap', 'instant_payment', 'pay_admin', 'stripe', 'web3', 'crypto', 'other'] as const;
const REASON_CODES: Record<string, readonly string[]> = {
  received:        ['late_payment', 'complimentary', 'data_entry_error', 'method_mismatch', 'other'],
  refund:          ['refund', 'method_mismatch', 'data_entry_error', 'other'],
  fee:             ['data_entry_error', 'method_mismatch', 'other'],
  cash_over_short: ['cash_over', 'cash_short'],
  prize_payout:    ['prize_award_delivered'],
};

type AdjType   = typeof ADJUSTMENT_TYPES[number];
type PayMethod = typeof PAYMENT_METHODS[number];

export interface AdjustmentEntry {
  id: number;
  type: AdjType;
  amount: number;
  currency: string;
  paymentMethod: PayMethod | null;
  reasonCode: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface Props {
  roomId: string;
  socket: any;
  adjustments: AdjustmentEntry[];
  currency: string;
  approvedAt: string | null;
  createdBy: string;
  onAdjustmentsChange: (next: AdjustmentEntry[]) => void;
}

function getMethodLabel(m: string): string {
  const map: Record<string, string> = {
    cash: 'Cash', card: 'Card', card_tap: 'Card (tap)', instant_payment: 'Instant Payment',
    pay_admin: 'Pay Host', stripe: 'Stripe', web3: 'Web3', crypto: 'Crypto', other: 'Other',
  };
  return map[m] ?? m;
}

// ─── Emit with timeout fallback ───────────────────────────────────────────────
// Socket.io ack callbacks aren't guaranteed — if the server doesn't call back
// within 5s, we treat it as success anyway so the UI doesn't hang.
function emitWithFallback(
  socket: any,
  event: string,
  payload: any,
  onDone: (ack?: any) => void,
  timeoutMs = 5000,
) {
  let settled = false;
  const settle = (ack?: any) => {
    if (settled) return;
    settled = true;
    onDone(ack);
  };
  const timer = setTimeout(() => settle(undefined), timeoutMs);
  socket.emit(event, payload, (ack: any) => {
    clearTimeout(timer);
    settle(ack);
  });
}

// ─── Single row ───────────────────────────────────────────────────────────────

interface RowProps {
  entry: AdjustmentEntry;
  currency: string;
  isLocked: boolean;
  isSaving: boolean;
  onSelectChange: (entry: AdjustmentEntry, field: keyof AdjustmentEntry, value: any) => void;
  onBlurSave:     (entry: AdjustmentEntry, updated: AdjustmentEntry) => void;
  onDelete:       (id: number) => void;
}

const AdjustmentRow: React.FC<RowProps> = ({
  entry, currency, isLocked, isSaving, onSelectChange, onBlurSave, onDelete,
}) => {
  const [draftAmount, setDraftAmount] = useState(String(entry.amount));
  const [draftNote,   setDraftNote]   = useState(entry.note ?? '');

  const prevIdRef = useRef(entry.id);
  if (prevIdRef.current !== entry.id) {
    prevIdRef.current = entry.id;
    setDraftAmount(String(entry.amount));
    setDraftNote(entry.note ?? '');
  }

  const allowedReasons = REASON_CODES[entry.type] ?? ['other'];

  return (
    <div className={`rounded-lg border border-gray-200 p-4 bg-gray-50 transition-opacity ${isSaving ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Type</label>
          <select disabled={isLocked || isSaving} value={entry.type}
            onChange={(e) => onSelectChange(entry, 'type', e.target.value as AdjType)}
            className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900">
            {ADJUSTMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Amount</label>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-sm">{currency}</span>
            <input type="number" step="0.01" min="0"
              disabled={isLocked || isSaving}
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              onBlur={() => {
                const parsed = parseFloat(draftAmount || '0');
                const safe = isNaN(parsed) ? 0 : Math.max(0, parsed);
                if (safe !== entry.amount) onBlurSave(entry, { ...entry, amount: safe });
              }}
              className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Method</label>
          <select disabled={isLocked || isSaving} value={entry.paymentMethod ?? 'cash'}
            onChange={(e) => onSelectChange(entry, 'paymentMethod', e.target.value as PayMethod)}
            className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{getMethodLabel(m)}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Reason</label>
          <select disabled={isLocked || isSaving}
            value={allowedReasons.includes(entry.reasonCode ?? '') ? entry.reasonCode! : allowedReasons[0]}
            onChange={(e) => onSelectChange(entry, 'reasonCode', e.target.value)}
            className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900">
            {allowedReasons.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="flex justify-end">
          {isSaving
            ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin mt-2" />
            : <button disabled={isLocked} onClick={() => onDelete(entry.id)}
                className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
          }
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Note (optional)</label>
        <input type="text" disabled={isLocked || isSaving}
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          onBlur={() => {
            const trimmed = draftNote.trim();
            if (trimmed !== (entry.note ?? '')) onBlurSave(entry, { ...entry, note: trimmed || null });
          }}
          placeholder="Add a note… (saves when you click away)"
          className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900" />
      </div>

      <div className="mt-1.5 text-right text-xs text-gray-400">
        {entry.createdBy && `By: ${entry.createdBy}`}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const EliminationAdjustmentsLedger: React.FC<Props> = ({
  roomId, socket, adjustments, currency, approvedAt, createdBy, onAdjustmentsChange,
}) => {
  const isLocked = !!approvedAt;
  const [saving, setSaving] = useState<Record<string | number, boolean>>({});

  // Persist: delete old row → insert updated row
  const persist = (oldEntry: AdjustmentEntry, updatedEntry: AdjustmentEntry) => {
    if (isLocked || !socket) return;
    onAdjustmentsChange(adjustments.map((a) => a.id === oldEntry.id ? updatedEntry : a));
    setSaving((s) => ({ ...s, [oldEntry.id]: true }));

    emitWithFallback(socket, 'elimination_delete_reconciliation_ledger_item',
      { roomId, adjustmentId: oldEntry.id },
      () => {
        emitWithFallback(socket, 'elimination_update_reconciliation_ledger',
          {
            roomId,
            adjustmentType: updatedEntry.type,
            amount:         updatedEntry.amount,
            currency:       updatedEntry.currency ?? currency,
            paymentMethod:  updatedEntry.paymentMethod,
            reasonCode:     updatedEntry.reasonCode,
            note:           updatedEntry.note,
            createdBy:      updatedEntry.createdBy ?? createdBy,
            ts:             updatedEntry.createdAt,
          },
          (ack?: any) => {
            setSaving((s) => { const n = { ...s }; delete n[oldEntry.id]; return n; });
            if (ack?.ok && ack.insertId) {
              onAdjustmentsChange(
                adjustments.map((a) => a.id === oldEntry.id ? { ...updatedEntry, id: ack.insertId } : a)
              );
            }
          }
        );
      }
    );
  };

  const handleSelectChange = (entry: AdjustmentEntry, field: keyof AdjustmentEntry, value: any) =>
    persist(entry, { ...entry, [field]: value });

  const handleBlurSave = (entry: AdjustmentEntry, updated: AdjustmentEntry) =>
    persist(entry, updated);

  // Add new entry
  const handleAdd = () => {
    if (isLocked || !socket) return;
    setSaving((s) => ({ ...s, new: true }));

    emitWithFallback(
      socket,
      'elimination_update_reconciliation_ledger',
      {
        roomId,
        adjustmentType: 'received',
        amount: 0,
        currency,
        paymentMethod: 'cash',
        reasonCode: 'late_payment',
        note: null,
        createdBy,
        ts: new Date().toISOString(),
      },
      (ack?: any) => {
        setSaving((s) => { const n = { ...s }; delete n.new; return n; });
        const newId = ack?.insertId ?? Date.now(); // fallback id if no ack
        const added: AdjustmentEntry = {
          id:            newId,
          type:          'received',
          amount:        0,
          currency,
          paymentMethod: 'cash',
          reasonCode:    'late_payment',
          note:          null,
          createdBy,
          createdAt:     new Date().toISOString(),
        };
        onAdjustmentsChange([...adjustments, added]);
      }
    );
  };

  // Delete entry
  const handleDelete = (id: number) => {
    if (isLocked || !socket) return;
    setSaving((s) => ({ ...s, [id]: true }));
    emitWithFallback(
      socket,
      'elimination_delete_reconciliation_ledger_item',
      { roomId, adjustmentId: id },
      (ack?: any) => {
        setSaving((s) => { const n = { ...s }; delete n[id]; return n; });
        if (!ack || ack.ok) { // treat timeout (undefined ack) as success too
          onAdjustmentsChange(adjustments.filter((a) => a.id !== id));
        }
      }
    );
  };

  const totals = useMemo(() => {
    let moneyIn = 0, moneyOut = 0;
    for (const a of adjustments) {
      const amt = Number(a.amount || 0);
      switch (a.type) {
        case 'received':     moneyIn  += amt; break;
        case 'refund':
        case 'fee':
        case 'prize_payout': moneyOut += amt; break;
        case 'cash_over_short':
          if (a.reasonCode === 'cash_over')  moneyIn  += amt;
          else if (a.reasonCode === 'cash_short') moneyOut += amt;
          break;
      }
    }
    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }, [adjustments]);

  const fmt = (n: number) => `${currency}${Number(n || 0).toFixed(2)}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Manual Adjustments</h3>
          <p className="text-xs text-gray-500 mt-0.5">Amount and notes save when you click away from the field</p>
        </div>
        <button onClick={handleAdd} disabled={isLocked || !!saving.new}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {saving.new ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Entry
        </button>
      </div>

      {adjustments.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-600">No adjustments recorded</p>
          <p className="text-xs mt-1 text-gray-400">Click "Add Entry" to record cash, refunds, or other adjustments</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {adjustments.map((entry) => (
            <AdjustmentRow
              key={entry.id}
              entry={entry}
              currency={currency}
              isLocked={isLocked}
              isSaving={!!saving[entry.id]}
              onSelectChange={handleSelectChange}
              onBlurSave={handleBlurSave}
              onDelete={handleDelete}
            />
          ))}

          <div className="pt-3 border-t border-gray-200 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="text-xs font-medium text-green-700 mb-1">Money In</div>
              <div className="text-lg font-bold text-green-900">{fmt(totals.moneyIn)}</div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Money Out</div>
              <div className="text-lg font-bold text-red-900">{fmt(totals.moneyOut)}</div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="text-xs font-medium text-blue-700 mb-1">Net Adjustment</div>
              <div className={`text-lg font-bold ${totals.net >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {totals.net >= 0 ? '+' : ''}{fmt(totals.net)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};