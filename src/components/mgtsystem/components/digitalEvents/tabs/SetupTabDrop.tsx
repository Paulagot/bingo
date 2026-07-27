// src/components/mgtsystem/components/digitalEvents/tabs/SetupTabDrop.tsx
//
// Setup tab for Puzzle Drop — read-only display + an Edit button that
// hands off to the shared EditFundraiserModal (onEditFundraiser), same
// convention as SetupTabSubscription and the elimination/ticketed-event
// branches of SetupTab. Deliberately not building a second inline editor
// here — updateDrop already exists and EditFundraiserModal already owns
// the "event + activity settings, saved together" flow; duplicating that
// logic in this tab would just create two ways to edit the same thing.
//
// Locked once status leaves 'scheduled', matching updateDrop's backend
// guard exactly (PATCH /puzzle-drop/:roomId returns 409 drop_not_editable
// once a Drop has gone on sale).

import { useEffect, useState } from 'react';
import { Pencil, Lock, Puzzle } from 'lucide-react';
import puzzleDropMgmtService, { type DropDetail } from '../../../services/PuzzleDropMgmtService';

interface Props {
  roomId: string;
  status: 'scheduled' | 'open' | 'completed' | 'cancelled';
  onEditFundraiser: () => void;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function SetupTabDrop({ roomId, status, onEditFundraiser }: Props) {
  const [detail, setDetail] = useState<DropDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    puzzleDropMgmtService.getDrop(roomId)
      .then(data => { if (!cancelled) setDetail(data); })
      .catch(e => { if (!cancelled) setError(e?.message || 'Failed to load Drop details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId]);

  const isScheduled = status === 'scheduled';
  const sym = detail?.config?.currencySymbol || '€';

  return (
    <div className="p-5 space-y-4">

      {isScheduled ? (
        <div className="flex items-center justify-between rounded-lg border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.06)] p-3">
          <p className="text-xs text-[#4c1d95]">
            Still scheduled — items, pricing and timing can be edited before this Drop goes on sale.
          </p>
          <button type="button" onClick={onEditFundraiser}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: '#7c3aed' }}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Items, pricing and timing were locked in once this Drop went on sale and can't be edited here —
            buyers have already purchased against this configuration. Contact support if this needs to change.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
        </div>
      ) : error || !detail ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error || 'Could not load this Drop.'}
        </div>
      ) : (
        <>
          <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#52636f]">Puzzles</p>
            <div className="space-y-1.5">
              {detail.items
                .slice()
                .sort((a, b) => a.display_order - b.display_order)
                .map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#fbf8f2' }}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
                        {item.item_number}
                      </span>
                      <span className="text-sm font-medium text-[#102532] flex items-center gap-1.5">
                        <Puzzle className="h-3.5 w-3.5 text-[#8a9bab]" />
                        {titleCase(item.puzzle_type)}
                      </span>
                    </div>
                    <span className="text-xs font-semibold capitalize text-[#52636f]">{item.difficulty}</span>
                  </div>
                ))}
              {detail.items.length === 0 && (
                <p className="text-sm text-[#8a9bab]">No puzzles configured.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#52636f]">Pricing tiers</p>
            <div className="space-y-1.5">
              {detail.pricingTiers.map(tier => (
                <div key={tier.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#fbf8f2' }}>
                  <span className="text-sm font-medium text-[#102532]">
                    {tier.label || `${tier.quantity} puzzle${tier.quantity !== 1 ? 's' : ''}`}
                  </span>
                  <span className="text-sm font-bold text-[#7c3aed]">{sym}{Number(tier.price).toFixed(2)}</span>
                </div>
              ))}
              {detail.pricingTiers.length === 0 && (
                <p className="text-sm text-[#8a9bab]">No pricing tiers configured.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Currency</p>
              <p className="mt-1 text-lg font-bold text-[#102532]">{detail.config?.currency?.toUpperCase() ?? '—'}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Time zone</p>
              <p className="mt-1 text-lg font-bold text-[#102532]">{detail.timeZone || 'Europe/Dublin'}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}