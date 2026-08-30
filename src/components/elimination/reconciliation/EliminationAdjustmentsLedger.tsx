// src/components/Elimination/reconciliation/EliminationAdjustmentsLedger.tsx
//
// Manual adjustment ledger.
//
// IMPORTANT FINANCIAL RECORD BEHAVIOUR:
//   - Add Entry creates a LOCAL draft only. Nothing is written to the DB yet.
//   - Changing fields does NOT save on blur/change.
//   - Save Adjustment performs exactly one INSERT for a new row.
//   - Editing an existing adjustment performs an UPDATE against the same DB row.
//   - Existing rows are never deleted/reinserted merely because a field changed.

import React, { useMemo, useState } from 'react';
import { Check, Edit3, Info, Loader2, Plus, Save, Trash2, X } from 'lucide-react';

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
  hostId: string;
  socket: any;
  adjustments: AdjustmentEntry[];
  currency: string;
  approvedAt: string | null;
  createdBy: string;
  onAdjustmentsChange: (next: AdjustmentEntry[]) => void;
}

type DraftEntry = Omit<AdjustmentEntry, 'id'> & { id: number | null };

function getMethodLabel(m: string): string {
  const map: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    card_tap: 'Card (tap)',
    instant_payment: 'Instant Payment',
    pay_admin: 'Pay Host',
    stripe: 'Stripe',
    web3: 'Web3',
    crypto: 'Crypto',
    other: 'Other',
  };
  return map[m] ?? m;
}

function formatLabel(value: string | null | undefined) {
  return value ? value.replace(/_/g, ' ') : '—';
}

function makeNewDraft(currency: string, createdBy: string): DraftEntry {
  return {
    id: null,
    type: 'received',
    amount: 0,
    currency,
    paymentMethod: 'cash',
    reasonCode: 'late_payment',
    note: null,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

function toDraft(entry: AdjustmentEntry): DraftEntry {
  return { ...entry };
}

export const EliminationAdjustmentsLedger: React.FC<Props> = ({
  roomId,
  hostId,
  socket,
  adjustments,
  currency,
  approvedAt,
  createdBy,
  onAdjustmentsChange,
}) => {
  const isLocked = !!approvedAt;

  const [draft, setDraft] = useState<DraftEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditingExisting = draft?.id != null;

  const allowedReasons = draft
    ? (REASON_CODES[draft.type] ?? ['other'])
    : [];

  const beginAdd = () => {
    if (isLocked || saving || deletingId != null) return;
    setError(null);
    setDraft(makeNewDraft(currency, createdBy));
  };

  const beginEdit = (entry: AdjustmentEntry) => {
    if (isLocked || saving || deletingId != null) return;
    setError(null);
    setDraft(toDraft(entry));
  };

  const cancelDraft = () => {
    if (saving) return;
    setError(null);
    setDraft(null);
  };

  const updateDraft = <K extends keyof DraftEntry>(field: K, value: DraftEntry[K]) => {
    setDraft((current) => {
      if (!current) return current;

      const next = { ...current, [field]: value };

      // When Type changes, make sure Reason remains valid for the new type.
      if (field === 'type') {
        const reasons = REASON_CODES[String(value)] ?? ['other'];
        if (!reasons.includes(next.reasonCode ?? '')) {
          next.reasonCode = reasons[0] ?? 'other';
        }
      }

      return next;
    });
  };

  const saveDraft = () => {
    if (!draft || isLocked || !socket || saving) return;

    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an adjustment amount greater than zero.');
      return;
    }

    if (!draft.reasonCode) {
      setError('Choose a reason for this adjustment.');
      return;
    }

    setSaving(true);
    setError(null);

    socket.emit(
      'elimination_update_reconciliation_ledger',
      {
        adjustmentId: draft.id,
        roomId,
        actorId: hostId,
        adjustmentType: draft.type,
        amount,
        currency: draft.currency ?? currency,
        paymentMethod: draft.paymentMethod,
        reasonCode: draft.reasonCode,
        note: draft.note?.trim() || null,
        createdBy: draft.createdBy ?? createdBy,
        ts: draft.createdAt,
      },
      (ack: any) => {
        setSaving(false);

        if (!ack?.ok) {
          setError(ack?.error || 'Could not save adjustment. Please try again.');
          return;
        }

        if (draft.id == null) {
          if (!ack.insertId) {
            setError('Adjustment saved but no database ID was returned. Refresh before adding another adjustment.');
            return;
          }

          const added: AdjustmentEntry = {
            ...draft,
            id: Number(ack.insertId),
            amount,
            note: draft.note?.trim() || null,
          };
          onAdjustmentsChange([...adjustments, added]);
        } else {
          const updated: AdjustmentEntry = {
            ...draft,
            id: draft.id,
            amount,
            note: draft.note?.trim() || null,
          };
          onAdjustmentsChange(
            adjustments.map((entry) => entry.id === draft.id ? updated : entry)
          );
        }

        setDraft(null);
      }
    );
  };

  const handleDelete = (id: number) => {
    if (isLocked || !socket || saving || deletingId != null) return;

    setDeletingId(id);
    setError(null);

    socket.emit(
      'elimination_delete_reconciliation_ledger_item',
      { roomId, adjustmentId: id, actorId: hostId },
      (ack: any) => {
        setDeletingId(null);

        if (!ack?.ok) {
          setError(ack?.error || 'Could not delete adjustment. Please try again.');
          return;
        }

        onAdjustmentsChange(adjustments.filter((entry) => entry.id !== id));
        if (draft?.id === id) setDraft(null);
      }
    );
  };

  const totals = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;

    // Only SAVED adjustments contribute to totals. An unsaved draft never alters
    // the official-looking reconciliation figures.
    for (const a of adjustments) {
      const amt = Number(a.amount || 0);
      switch (a.type) {
        case 'received':
          moneyIn += amt;
          break;
        case 'refund':
        case 'fee':
        case 'prize_payout':
          moneyOut += amt;
          break;
        case 'cash_over_short':
          if (a.reasonCode === 'cash_over') moneyIn += amt;
          else if (a.reasonCode === 'cash_short') moneyOut += amt;
          break;
      }
    }

    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }, [adjustments]);

  const fmt = (n: number) => `${currency}${Number(n || 0).toFixed(2)}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Manual Adjustments</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Nothing is posted until you click Save Adjustment.
          </p>
        </div>

        <button
          type="button"
          onClick={beginAdd}
          disabled={isLocked || !!draft || saving || deletingId != null}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Adjustment
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {draft && (
        <div className="m-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-bold text-gray-900">
                {isEditingExisting ? 'Edit Adjustment' : 'New Adjustment'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Complete the fields below, then save once.
              </div>
            </div>
            {!saving && (
              <button
                type="button"
                onClick={cancelDraft}
                className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Type</label>
              <select
                disabled={saving}
                value={draft.type}
                onChange={(e) => updateDraft('type', e.target.value as AdjType)}
                className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Amount</label>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">{currency}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={saving}
                  value={draft.amount === 0 ? '' : String(draft.amount)}
                  onChange={(e) => updateDraft('amount', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Method</label>
              <select
                disabled={saving}
                value={draft.paymentMethod ?? 'cash'}
                onChange={(e) => updateDraft('paymentMethod', e.target.value as PayMethod)}
                className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{getMethodLabel(m)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Reason</label>
              <select
                disabled={saving}
                value={draft.reasonCode ?? allowedReasons[0] ?? 'other'}
                onChange={(e) => updateDraft('reasonCode', e.target.value)}
                className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
              >
                {allowedReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Note (optional)</label>
            <input
              type="text"
              disabled={saving}
              value={draft.note ?? ''}
              onChange={(e) => updateDraft('note', e.target.value)}
              placeholder="Add a note for the reconciliation record…"
              className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
            />
          </div>

          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={cancelDraft}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Adjustment'}
            </button>
          </div>
        </div>
      )}

      {adjustments.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-600">No adjustments recorded</p>
          <p className="text-xs mt-1 text-gray-400">Click “Add Adjustment” if something needs to be added or deducted.</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {adjustments.map((entry) => {
            const deleting = deletingId === entry.id;
            const activeEdit = draft?.id === entry.id;

            return (
              <div
                key={entry.id}
                className={`rounded-lg border p-4 transition-colors ${
                  activeEdit ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50'
                } ${deleting ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 flex-1">
                    <div>
                      <div className="text-[10px] uppercase font-medium text-gray-400">Type</div>
                      <div className="text-sm font-semibold text-gray-900 capitalize">{formatLabel(entry.type)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-medium text-gray-400">Amount</div>
                      <div className="text-sm font-bold text-gray-900">{fmt(entry.amount)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-medium text-gray-400">Method</div>
                      <div className="text-sm text-gray-700">{getMethodLabel(entry.paymentMethod ?? 'cash')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-medium text-gray-400">Reason</div>
                      <div className="text-sm text-gray-700 capitalize">{formatLabel(entry.reasonCode)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {deleting ? (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isLocked || !!draft || saving || deletingId != null}
                          onClick={() => beginEdit(entry)}
                          className="rounded p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                          title="Edit adjustment"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isLocked || !!draft || saving || deletingId != null}
                          onClick={() => handleDelete(entry.id)}
                          className="rounded p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
                          title="Delete adjustment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {entry.note && (
                  <div className="mt-3 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm text-gray-600">
                    {entry.note}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Check className="h-3 w-3" />
                  Saved{entry.createdBy ? ` · By ${entry.createdBy}` : ''}
                </div>
              </div>
            );
          })}

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