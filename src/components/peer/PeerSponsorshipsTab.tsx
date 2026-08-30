// src/components/peer/PeerSponsorshipsTab.tsx
//
// Sponsorships tab for sponsored-format peer fundraisers.
// Matches the pattern of PeerOrdersTab and PeerDonationsTab:
//   - Search by sponsor name, participant name, or payment reference
//   - Cards collapsed by default (name + amount + status visible)
//   - Expand to see full detail and action buttons
//   - Inline confirm / dispute with reason field
//   - Resolve disputed sponsorships
//   - Attention banner for claimed count

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { PeerSponsorshipContribution } from '../../services/PeerService';
import svc from '../../services/PeerService';
import { brand } from '../dashboard/branding';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  confirmed: { background: '#dcfce7', color: '#166534' },
  claimed:   { background: '#fef3c7', color: '#92400e' },
  disputed:  { background: '#fee2e2', color: '#991b1b' },
};

interface Props {
  fundraiserId:  string;
  sponsorships:  PeerSponsorshipContribution[];
  currency:      string;
  onChanged:     () => void;
}

export default function PeerSponsorshipsTab({
  fundraiserId,
  sponsorships,
  currency,
  onChanged,
}: Props) {
  const [search,      setSearch]      = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [busy,        setBusy]        = useState<Record<string, boolean>>({});
  const [disputeId,   setDisputeId]   = useState<string | null>(null);
  const [reason,      setReason]      = useState('');

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sponsorships;
    return sponsorships.filter(c =>
      (c.sponsorName   || '').toLowerCase().includes(q) ||
      (c.displayName   || '').toLowerCase().includes(q) ||
      (c.participantName || '').toLowerCase().includes(q) ||
      (c.paymentReference || '').toLowerCase().includes(q),
    );
  }, [sponsorships, search]);

  const setBusyFor = (id: string, val: boolean) =>
    setBusy(prev => ({ ...prev, [id]: val }));

  const confirmSponsorship = async (id: string) => {
    setBusyFor(id, true);
    try { await svc.confirmSponsorship(fundraiserId, id); onChanged(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(id, false); }
  };

  const submitDispute = async (id: string) => {
    if (!reason.trim()) return;
    setBusyFor(id, true);
    try {
      await svc.disputeSponsorship(fundraiserId, id, reason.trim());
      setDisputeId(null);
      setReason('');
      onChanged();
    } catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(id, false); }
  };

  const claimedCount = sponsorships.filter(c => c.status === 'claimed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold" style={{ color: brand.navy }}>Sponsorships</h3>
        <p className="mt-1 text-sm" style={{ color: brand.slate }}>
          Confirmed sponsorships and manual payments awaiting confirmation.
          Unfinished Stripe and crypto attempts are not shown.
        </p>
      </div>

      {/* Attention banner */}
      {claimedCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
        >
          ⚠️ {claimedCount} sponsorship{claimedCount === 1 ? '' : 's'} awaiting your confirmation
        </div>
      )}

      {/* Search */}
      {sponsorships.length > 0 && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: brand.slate }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by sponsor name, participant or reference…"
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent"
            style={{ borderColor: brand.border, background: '#fff' }}
          />
        </div>
      )}

      {/* Empty state */}
      {sponsorships.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: brand.border }}
        >
          <p className="text-sm font-semibold" style={{ color: brand.slate }}>
            No confirmed or claimed sponsorships yet.
          </p>
        </div>
      )}

      {/* No search results */}
      {sponsorships.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: brand.slate }}>
          No sponsorships match "{search}"
        </p>
      )}

      {/* Sponsorship cards */}
      <div className="space-y-3">
        {filtered.map(c => {
          const expanded    = expandedIds.has(c.id);
          const isBusy      = busy[c.id] ?? false;
          const isDisputing = disputeId === c.id;
          const displayName = c.isAnonymous
            ? 'Anonymous'
            : c.displayName || c.sponsorName || 'Sponsor';
          const statusStyle = STATUS_STYLE[c.status] ?? STATUS_STYLE.claimed;

          return (
            <div
              key={c.id}
              className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: brand.border }}
            >
              {/* Collapsed summary row - always visible */}
              <button
                type="button"
                onClick={() => toggleExpand(c.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: brand.navy }}>
                      {displayName}
                    </span>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={statusStyle}
                    >
                      {c.status}
                    </span>
                    {c.status === 'claimed' && (
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ background: '#fef3c7', color: '#92400e' }}
                      >
                        Needs confirmation
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: brand.slate }}>
                    {c.participantName ? `For ${c.participantName}` : 'General fundraiser'}
                    {' · '}
                    {c.paymentMethodLabel || c.paymentMethodCategory}
                    {' · '}
                    {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-black text-sm" style={{ color: brand.navy }}>
                    {currency} {Number(c.amount || 0).toFixed(2)}
                  </span>
                  {expanded
                    ? <ChevronUp  className="h-4 w-4" style={{ color: brand.slate }} />
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
                  {/* Detail rows */}
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs"
                    style={{ color: brand.slate }}
                  >
                    {c.sponsorEmail && (
                      <>
                        <span className="font-semibold">Email</span>
                        <span>{c.sponsorEmail}</span>
                      </>
                    )}
                    {c.paymentReference && (
                      <>
                        <span className="font-semibold">Reference</span>
                        <span>{c.paymentReference}</span>
                      </>
                    )}
                    <span className="font-semibold">Date</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                    {c.confirmedAt && (
                      <>
                        <span className="font-semibold">Confirmed</span>
                        <span>{new Date(c.confirmedAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>

                  {/* Personal message */}
                  {c.message && (
                    <p
                      className="text-sm italic rounded-lg px-3 py-2"
                      style={{ background: brand.bg, color: brand.slate }}
                    >
                      "{c.message}"
                    </p>
                  )}

                  {/* Dispute reason */}
                  {c.disputeReason && (
                    <p className="text-xs font-semibold text-red-700">
                      Dispute reason: {c.disputeReason}
                    </p>
                  )}

                  {/* ── Claimed: confirm or open dispute form ── */}
                  {c.status === 'claimed' && !isDisputing && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => confirmSponsorship(c.id)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#16a34a' }}
                      >
                        {isBusy ? 'Saving…' : 'Confirm payment'}
                      </button>
                      <button
                        onClick={() => { setDisputeId(c.id); setReason(''); }}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#dc2626' }}
                      >
                        Dispute
                      </button>
                    </div>
                  )}

                  {/* ── Inline dispute reason form ── */}
                  {c.status === 'claimed' && isDisputing && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold" style={{ color: brand.navy }}>
                        Reason for dispute <span style={{ color: '#e9574f' }}>*</span>
                      </p>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
                        style={{ borderColor: brand.border }}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. payment not received"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitDispute(c.id)}
                          disabled={isBusy || !reason.trim()}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: '#dc2626' }}
                        >
                          {isBusy ? 'Submitting…' : 'Submit dispute'}
                        </button>
                        <button
                          onClick={() => { setDisputeId(null); setReason(''); }}
                          className="rounded-lg border px-3 py-2 text-xs font-semibold"
                          style={{ borderColor: brand.border, color: brand.slate }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Disputed: resolve and confirm ── */}
                  {c.status === 'disputed' && (
                    <div className="pt-1">
                      <button
                        onClick={() => confirmSponsorship(c.id)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#16a34a' }}
                      >
                        {isBusy ? 'Saving…' : 'Resolve and confirm'}
                      </button>
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