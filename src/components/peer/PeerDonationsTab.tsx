// src/components/peer/PeerDonationsTab.tsx
//
// Donations tab extracted from PeerFundraiserDrawer.
// Features:
//   - Search by donor name, participant name
//   - Expand / collapse each donation card
//   - Inline confirm / reject (no window.prompt — same pattern as PeerOrdersTab)
//   - Only shown for door_to_door fundraisers (drawer handles the guard)

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { PeerDirectDonation } from '../../services/PeerService';
import svc from '../../services/PeerService';
import { brand } from '../dashboard/branding';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  confirmed: { background: '#dcfce7', color: '#166534' },
  claimed:   { background: '#fef3c7', color: '#92400e' },
  failed:    { background: '#fee2e2', color: '#991b1b' },
};

interface Props {
  fundraiserId: string;
  donations:    PeerDirectDonation[];
  onChanged:    () => void;
}

export default function PeerDonationsTab({ fundraiserId, donations, onChanged }: Props) {
  const [search,      setSearch]      = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [busy,        setBusy]        = useState<Record<string, boolean>>({});
  const [rejectId,    setRejectId]    = useState<string | number | null>(null);

  const toggleExpand = (id: string | number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return donations;
    return donations.filter(d =>
      (d.donor_name || '').toLowerCase().includes(q) ||
      (d.participant_name || '').toLowerCase().includes(q) ||
      (d.donor_email || '').toLowerCase().includes(q),
    );
  }, [donations, search]);

  const setBusyFor = (id: string | number, val: boolean) =>
    setBusy(prev => ({ ...prev, [String(id)]: val }));

  const confirmDonation = async (d: PeerDirectDonation) => {
    setBusyFor(d.id, true);
    try { await svc.confirmDonation(fundraiserId, d.id); onChanged(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(d.id, false); }
  };

  const rejectDonation = async (d: PeerDirectDonation) => {
    setBusyFor(d.id, true);
    try {
      await svc.rejectDonation(fundraiserId, d.id);
      setRejectId(null);
      onChanged();
    } catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(d.id, false); }
  };

  const claimedCount = donations.filter(d => d.status === 'claimed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold" style={{ color: brand.navy }}>Direct Donations</h3>
        <p className="mt-1 text-sm" style={{ color: brand.slate }}>
          Donations are separate from activity-sale income. Confirmed donations count
          in the combined report; claimed manual donations wait for club confirmation.
        </p>
      </div>

      {/* Attention banner */}
      {claimedCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
        >
          ⚠️ {claimedCount} donation{claimedCount === 1 ? '' : 's'} awaiting your confirmation
        </div>
      )}

      {/* Search */}
      {donations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: brand.slate }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by donor or participant name…"
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent"
            style={{ borderColor: brand.border, background: '#fff' }}
          />
        </div>
      )}

      {/* Empty state */}
      {donations.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: brand.border }}
        >
          <p className="text-sm font-semibold" style={{ color: brand.slate }}>
            No confirmed or claimed direct donations yet.
          </p>
        </div>
      )}

      {/* No results */}
      {donations.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: brand.slate }}>
          No donations match "{search}"
        </p>
      )}

      {/* Donation cards */}
      <div className="space-y-3">
        {filtered.map(d => {
          const expanded    = expandedIds.has(d.id);
          const isBusy      = busy[String(d.id)] ?? false;
          const isRejecting = rejectId === d.id;
          const statusStyle = STATUS_STYLE[d.status] ?? STATUS_STYLE.claimed;

          return (
            <div
              key={d.id}
              className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: brand.border }}
            >
              {/* Summary row */}
              <button
                type="button"
                onClick={() => toggleExpand(d.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: brand.navy }}>
                      {d.donor_name || 'Anonymous donor'}
                    </span>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={statusStyle}
                    >
                      {d.status}
                    </span>
                    {d.status === 'claimed' && (
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ background: '#fef3c7', color: '#92400e' }}
                      >
                        Needs confirmation
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: brand.slate }}>
                    {d.participant_name ? `For ${d.participant_name}` : 'General fundraiser'}
                    {' · '}
                    {d.payment_method_label_snapshot || d.payment_method_category_snapshot}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-black text-sm" style={{ color: brand.navy }}>
                    {d.currency} {Number(d.amount || 0).toFixed(2)}
                  </span>
                  {expanded
                    ? <ChevronUp className="h-4 w-4" style={{ color: brand.slate }} />
                    : <ChevronDown className="h-4 w-4" style={{ color: brand.slate }} />
                  }
                </div>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div
                  className="px-4 pb-4 pt-0 border-t space-y-3"
                  style={{ borderColor: brand.border }}
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs" style={{ color: brand.slate }}>
                    {d.donor_email && (
                      <>
                        <span className="font-semibold">Email</span>
                        <span>{d.donor_email}</span>
                      </>
                    )}
                    <span className="font-semibold">Date</span>
                    <span>{new Date(d.created_at).toLocaleString()}</span>
                    {d.confirmed_at && (
                      <>
                        <span className="font-semibold">Confirmed</span>
                        <span>{new Date(d.confirmed_at).toLocaleString()}</span>
                      </>
                    )}
                    {d.peer_order_id && (
                      <>
                        <span className="font-semibold">Linked order</span>
                        <span className="font-mono">{String(d.peer_order_id).slice(0, 12)}…</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {d.status === 'claimed' && !isRejecting && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => confirmDonation(d)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#16a34a' }}
                      >
                        {isBusy ? 'Saving…' : 'Confirm donation'}
                      </button>
                      <button
                        onClick={() => setRejectId(d.id)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#dc2626' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Inline reject confirmation */}
                  {d.status === 'claimed' && isRejecting && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold" style={{ color: brand.navy }}>
                        Reject this donation? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => rejectDonation(d)}
                          disabled={isBusy}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: '#dc2626' }}
                        >
                          {isBusy ? 'Rejecting…' : 'Yes, reject'}
                        </button>
                        <button
                          onClick={() => setRejectId(null)}
                          className="rounded-lg border px-3 py-2 text-xs font-semibold"
                          style={{ borderColor: brand.border, color: brand.slate }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}