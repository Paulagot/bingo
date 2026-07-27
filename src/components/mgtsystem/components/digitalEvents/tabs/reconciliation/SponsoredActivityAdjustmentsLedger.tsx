// src/components/mgtsystem/components/digitalEvents/tabs/reconciliation/SponsoredActivityAdjustmentsLedger.tsx
//
// Same shape as SubscriptionAdjustmentsLedger (add/edit/delete, saves on
// blur) — fresh copy rather than shared/generalized, matching the house
// preference. Points at sponsoredActivityReconciliationService instead.
//
// UNLIKE Subscription's version: cash_over_short and prize_payout are
// included in the picker here. Subscriptions are Stripe-only so those
// never apply; Drop confirms via cash, instant payment, crypto, and
// Stripe (see puzzleDropService.js), so a cash drawer being over/short
// or a prize payout tied to a Drop leaderboard are both realistic.

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Info, Loader2 } from 'lucide-react';
import sponsoredActivityReconciliationService, {
  type SponsoredActivityAdjustment,
  type AdjustmentType,
  type ReasonCode,
} from '../../../../services/SponsoredActivityReconciliationService';

const ADJUSTMENT_TYPES: AdjustmentType[] = ['received', 'refund',  'cash_over_short', 'expense'];
const REASON_CODES: Record<AdjustmentType, ReasonCode[]> = {
  received: [
    'late_payment',
    'complimentary',
    'data_entry_error',
    'other',
  ],
  refund: [
    'refund',
    'data_entry_error',
    'other',
  ],
  fee: [
    'data_entry_error',
    'other',
  ],
  cash_over_short: [
    'cash_over',
    'cash_short',
  ],
  prize_payout: [
    'prize_award_delivered',
  ],
  expense: [
    'venue_hire',
    'equipment',
    'catering',
    'printing',
    'marketing',
    'insurance',
    'professional_fees',
    'travel',
    'payment_processing',
    'other_expense',
  ],
};

interface RowProps {
  entry: SponsoredActivityAdjustment;
  currency: string;
  isLocked: boolean;
  isSaving: boolean;
  onSelectChange: (id: string, field: string, value: string) => void;
  onBlurAmount:   (id: string, amount: number) => void;
  onBlurNote:     (id: string, note: string) => void;
  onDelete:       (id: string) => void;
}

const AdjustmentRow: React.FC<RowProps> = ({
  entry, currency, isLocked, isSaving,
  onSelectChange, onBlurAmount, onBlurNote, onDelete,
}) => {
  const [draftAmount, setDraftAmount] = useState(String(entry.amount));
  const [draftNote, setDraftNote]     = useState(entry.note ?? '');

  const allowedReasons = REASON_CODES[entry.adjustmentType] ?? ['other'];

  return (
    <div className={`rounded-lg border border-gray-200 p-4 bg-gray-50 transition-opacity ${isSaving ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Type</label>
          <select disabled={isLocked || isSaving} value={entry.adjustmentType}
            onChange={e => onSelectChange(entry.id, 'adjustmentType', e.target.value)}
            className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900">
            {ADJUSTMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Amount</label>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-sm">{currency}</span>
            <input type="number" step="0.01" min="0" disabled={isLocked || isSaving}
              value={draftAmount} onChange={e => setDraftAmount(e.target.value)}
              onBlur={() => {
                const parsed = parseFloat(draftAmount || '0');
                const safe = isNaN(parsed) ? 0 : Math.max(0, parsed);
                if (safe !== entry.amount) onBlurAmount(entry.id, safe);
              }}
              className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Reason</label>
          <select disabled={isLocked || isSaving}
            value={allowedReasons.includes(entry.reasonCode as ReasonCode) ? entry.reasonCode! : allowedReasons[0]}
            onChange={e => onSelectChange(entry.id, 'reasonCode', e.target.value)}
            className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900">
            {allowedReasons.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="flex justify-end">
          {isSaving
            ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin mt-2" />
            : (
              <button disabled={isLocked} onClick={() => onDelete(entry.id)}
                className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Note (optional)</label>
        <input type="text" disabled={isLocked || isSaving} value={draftNote}
          onChange={e => setDraftNote(e.target.value)}
          onBlur={() => {
            const trimmed = draftNote.trim();
            if (trimmed !== (entry.note ?? '')) onBlurNote(entry.id, trimmed);
          }}
          placeholder="Add a note… (saves when you click away)"
          className="w-full text-sm rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900" />
      </div>

      {entry.createdBy && (
        <div className="mt-1.5 text-right text-xs text-gray-400">By: {entry.createdBy}</div>
      )}
    </div>
  );
};

interface Props {
  roomId: string;
  adjustments: SponsoredActivityAdjustment[];
  currency: string;
  isLocked: boolean;
  approverName: string;
  onChange: (next: SponsoredActivityAdjustment[]) => void;
}

export const SponsoredActivityAdjustmentsLedger: React.FC<Props> = ({
  roomId, adjustments, currency, isLocked, approverName, onChange,
}) => {
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [addingNew, setAddingNew] = useState(false);

  const setRowSaving = (id: string, val: boolean) =>
    setSaving(s => val ? { ...s, [id]: true } : (({ [id]: _, ...rest }) => rest)(s));

  const handleAdd = async () => {
    if (isLocked || addingNew) return;
    setAddingNew(true);
    try {
      const res = await sponsoredActivityReconciliationService.addAdjustment(roomId, {
        adjustmentType: 'fee',
        amount: 0,
        paymentMethod: 'other',
        reasonCode: 'data_entry_error',
        note: null,
        createdBy: approverName,
      });
      onChange([...adjustments, res.adjustment]);
    } catch (e) {
      console.error('[SponsoredActivityAdjustmentsLedger] add failed:', e);
    } finally {
      setAddingNew(false);
    }
  };

  const handleSelectChange = async (id: string, field: string, value: string) => {
    if (isLocked) return;
    let patch: Partial<SponsoredActivityAdjustment> = { [field]: value } as any;
    if (field === 'adjustmentType') {
      const newType = value as AdjustmentType;
      const firstReason = REASON_CODES[newType]?.[0] ?? 'other';
      const entry = adjustments.find(a => a.id === id);
      if (entry && !REASON_CODES[newType]?.includes(entry.reasonCode as ReasonCode)) {
        patch = { ...patch, reasonCode: firstReason } as any;
      }
    }
    onChange(adjustments.map(a => a.id === id ? { ...a, ...patch } : a));
    setRowSaving(id, true);
    try {
      await sponsoredActivityReconciliationService.updateAdjustment(roomId, id, patch as any);
    } catch (e) {
      console.error('[SponsoredActivityAdjustmentsLedger] update failed:', e);
    } finally {
      setRowSaving(id, false);
    }
  };

  const handleBlurAmount = async (id: string, amount: number) => {
    if (isLocked) return;
    onChange(adjustments.map(a => a.id === id ? { ...a, amount } : a));
    setRowSaving(id, true);
    try {
      await sponsoredActivityReconciliationService.updateAdjustment(roomId, id, { amount });
    } catch (e) {
      console.error('[SponsoredActivityAdjustmentsLedger] amount update failed:', e);
    } finally {
      setRowSaving(id, false);
    }
  };

  const handleBlurNote = async (id: string, note: string) => {
    if (isLocked) return;
    onChange(adjustments.map(a => a.id === id ? { ...a, note: note || null } : a));
    setRowSaving(id, true);
    try {
      await sponsoredActivityReconciliationService.updateAdjustment(roomId, id, { note });
    } catch (e) {
      console.error('[SponsoredActivityAdjustmentsLedger] note update failed:', e);
    } finally {
      setRowSaving(id, false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isLocked) return;
    setRowSaving(id, true);
    try {
      await sponsoredActivityReconciliationService.deleteAdjustment(roomId, id);
      onChange(adjustments.filter(a => a.id !== id));
    } catch (e) {
      console.error('[SponsoredActivityAdjustmentsLedger] delete failed:', e);
    } finally {
      setRowSaving(id, false);
    }
  };

  const totals = useMemo(() => {
    let moneyIn = 0, moneyOut = 0;
    for (const a of adjustments) {
      if (a.adjustmentType === 'received') moneyIn += a.amount;
      else if (a.adjustmentType === 'cash_over_short') {
        if (a.reasonCode === 'cash_over') moneyIn += a.amount;
        else moneyOut += a.amount;
      } else moneyOut += a.amount; // refund / fee / prize_payout
    }
    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }, [adjustments]);

  const fmt = (n: number) => `${currency}${Number(n || 0).toFixed(2)}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">This Period's Adjustments</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLocked ? 'Locked after approval' : 'Refunds, fees, cash discrepancies, or prize payouts for the current period'}
          </p>
        </div>
        <button onClick={handleAdd} disabled={isLocked || addingNew}
          className="flex items-center gap-2 rounded-lg bg-[#7c3aed] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-colors">
          {addingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Entry
        </button>
      </div>

      {adjustments.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-600">No adjustments this period</p>
          <p className="text-xs mt-1">Record a refund, fee, or correction if needed</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {adjustments.map(entry => (
            <AdjustmentRow key={entry.id} entry={entry} currency={currency}
              isLocked={isLocked} isSaving={!!saving[entry.id]}
              onSelectChange={handleSelectChange} onBlurAmount={handleBlurAmount}
              onBlurNote={handleBlurNote} onDelete={handleDelete} />
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