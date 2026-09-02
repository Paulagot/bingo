// src/components/peer/PeerOrdersTab.tsx
//
// Orders tab extracted from PeerFundraiserDrawer.
// Features:
//   - Search by supporter name, participant name, or payment reference
//   - Sort by date (newest/oldest) or amount (high/low)
//   - Expand / collapse each order card
//   - Scrollable list (inherits drawer scroll)
//   - Confirm / reject / retry fulfilment / undo - same logic as original drawer

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, SortAsc } from 'lucide-react';
import type { PeerOrder } from '../../services/PeerService';
import svc from '../../services/PeerService';
import { brand } from '../dashboard/branding';

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  confirmed: { background: '#dcfce7', color: '#166534' },
  claimed:   { background: '#fef3c7', color: '#92400e' },
  pending:   { background: '#f1f5f9', color: '#475569' },
  failed:    { background: '#fee2e2', color: '#991b1b' },
  cancelled: { background: '#f1f5f9', color: '#475569' },
  refunded:  { background: '#ede9fe', color: '#5b21b6' },
};

interface Props {
  fundraiserId: string;
  orders:       PeerOrder[];
  onChanged:    () => void;
}

export default function PeerOrdersTab({ fundraiserId, orders, onChanged }: Props) {
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState<SortKey>('date_desc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [busy,        setBusy]        = useState<Record<string, boolean>>({});
  const [rejectId,    setRejectId]    = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? orders.filter(o =>
          o.supporter_name.toLowerCase().includes(q) ||
          (o.participant_name || '').toLowerCase().includes(q) ||
          (o.payment_reference || '').toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q),
        )
      : orders;

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'date_asc':    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_desc':   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'amount_desc': return Number(b.total_amount) - Number(a.total_amount);
        case 'amount_asc':  return Number(a.total_amount) - Number(b.total_amount);
        default:            return 0;
      }
    });
  }, [orders, search, sort]);

  const setBusyFor = (id: string, val: boolean) =>
    setBusy(prev => ({ ...prev, [id]: val }));

  const confirmOrder = async (o: PeerOrder) => {
    setBusyFor(o.id, true);
    try { await svc.confirm(fundraiserId, o.id); onChanged(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(o.id, false); }
  };

  const submitReject = async (o: PeerOrder) => {
    setBusyFor(o.id, true);
    try {
      await svc.rejectOrder(fundraiserId, o.id, rejectReason.trim() || undefined);
      setRejectId(null);
      setRejectReason('');
      onChanged();
    } catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(o.id, false); }
  };

  const undoConfirm = async (o: PeerOrder) => {
    if (!confirm('This order is confirmed and may have active tickets or entitlements. Undo confirmation?')) return;
    setBusyFor(o.id, true);
    try {
      const reason = window.prompt('Reason for undoing confirmation (optional):') || undefined;
      await svc.rejectOrder(fundraiserId, o.id, reason);
      onChanged();
    } catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(o.id, false); }
  };

  const retryFulfilment = async (o: PeerOrder) => {
    setBusyFor(o.id, true);
    try { await svc.retryFulfilment(fundraiserId, o.id); onChanged(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setBusyFor(o.id, false); }
  };

  const claimedCount = orders.filter(o => o.payment_status === 'claimed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold" style={{ color: brand.navy }}>Orders</h3>
        <p className="mt-1 text-sm" style={{ color: brand.slate }}>
          Confirmed orders and claimed manual payments awaiting confirmation.
          Unfinished Stripe and crypto attempts are not shown.
        </p>
      </div>

      {/* Attention banner */}
      {claimedCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
        >
          ⚠️ {claimedCount} manual payment{claimedCount === 1 ? '' : 's'} awaiting your confirmation
        </div>
      )}

      {/* Search + sort toolbar */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: brand.slate }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, participant or reference…"
              className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent"
              style={{ borderColor: brand.border, background: '#fff' }}
            />
          </div>
          <div className="relative flex-shrink-0">
            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: brand.slate }} />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="rounded-lg border pl-8 pr-8 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#157f85]"
              style={{ borderColor: brand.border, background: '#fff', color: brand.navy }}
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: brand.border }}
        >
          <p className="text-sm font-semibold" style={{ color: brand.slate }}>
            No confirmed or claimed orders yet.
          </p>
        </div>
      )}

      {/* No results from search */}
      {orders.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: brand.slate }}>
          No orders match "{search}"
        </p>
      )}

      {/* Order cards */}
      <div className="space-y-3">
        {filtered.map(o => {
          const expanded = expandedIds.has(o.id);
          const isBusy   = busy[o.id] ?? false;
          const statusStyle = STATUS_STYLE[o.payment_status] ?? STATUS_STYLE.pending;
          const isRejecting = rejectId === o.id;

          return (
            <div
              key={o.id}
              className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: brand.border }}
            >
              {/* Collapsed summary row - always visible */}
              <button
                type="button"
                onClick={() => toggleExpand(o.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: brand.navy }}>
                      {o.supporter_name}
                    </span>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={statusStyle}
                    >
                      {o.payment_status}
                    </span>
                    {o.payment_status === 'claimed' && (
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ background: '#fef3c7', color: '#92400e' }}
                      >
                        Needs confirmation
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: brand.slate }}>
                    {o.participant_name || 'General link'}
                    {' · '}
                    {o.payment_provider || o.payment_method_category}
                    {' · '}
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-black text-sm" style={{ color: brand.navy }}>
                    {o.currency || 'EUR'} {Number(o.total_amount || 0).toFixed(2)}
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
                  {/* Detail rows */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs" style={{ color: brand.slate }}>
                    <span className="font-semibold">Order ID</span>
                    <span className="font-mono">{o.id.slice(0, 16)}…</span>
                    {o.payment_reference && (
                      <>
                        <span className="font-semibold">Reference</span>
                        <span>{o.payment_reference}</span>
                      </>
                    )}
                    <span className="font-semibold">Email</span>
                    <span>{o.supporter_email}</span>
                    {o.supporter_phone && (
                      <>
                        <span className="font-semibold">Phone</span>
                        <span>{o.supporter_phone}</span>
                      </>
                    )}
                    <span className="font-semibold">Date</span>
                    <span>{new Date(o.created_at).toLocaleString()}</span>
                    {o.confirmed_at && (
                      <>
                        <span className="font-semibold">Confirmed</span>
                        <span>{new Date(o.confirmed_at).toLocaleString()}</span>
                      </>
                    )}
                  </div>

                  {/* Fulfilment info (confirmed orders) */}
                  {o.payment_status === 'confirmed' && (
                    <div className="text-xs space-y-1 pt-1" style={{ color: brand.slate }}>
                      <p>Entries: {Number(o.confirmed_entry_count || 0)}/{Number(o.entry_count || 0)} fulfilled</p>
                      {o.allocation_check && (
                        <p>
                          Ledger {Number(o.allocation_check.ledgerTotal || 0).toFixed(2)}
                          {' / '}
                          order {Number(o.allocation_check.orderTotal ?? o.total_amount ?? 0).toFixed(2)}
                        </p>
                      )}
                      {Number(o.ticket_entry_count || 0) > 0 && (
                        <p className={
                          Number(o.ticket_email_sent_count || 0) >= Number(o.ticket_entry_count || 0)
                            ? 'font-semibold text-green-700'
                            : Number(o.ticket_email_failed_count || 0) > 0
                              ? 'font-semibold text-red-700'
                              : 'font-semibold text-amber-700'
                        }>
                          Ticket emails: {Number(o.ticket_email_sent_count || 0)}/{Number(o.ticket_entry_count || 0)} sent
                        </p>
                      )}
                      {o.fulfilment_error && (
                        <p className="font-semibold text-red-700">{o.fulfilment_error}</p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Claimed: confirm or reject */}
                    {o.payment_status === 'claimed' && !isRejecting && (
                      <>
                        <button
                          onClick={() => confirmOrder(o)}
                          disabled={isBusy}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: '#16a34a' }}
                        >
                          {isBusy ? 'Saving…' : 'Confirm payment'}
                        </button>
                        <button
                          onClick={() => { setRejectId(o.id); setRejectReason(''); }}
                          disabled={isBusy}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: '#dc2626' }}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {/* Inline reject reason form */}
                    {o.payment_status === 'claimed' && isRejecting && (
                      <div className="w-full space-y-2">
                        <p className="text-xs font-semibold" style={{ color: brand.navy }}>
                          Reason for rejection (optional)
                        </p>
                        <input
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
                          style={{ borderColor: brand.border }}
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="e.g. payment not received"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitReject(o)}
                            disabled={isBusy}
                            className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: '#dc2626' }}
                          >
                            {isBusy ? 'Rejecting…' : 'Confirm rejection'}
                          </button>
                          <button
                            onClick={() => { setRejectId(null); setRejectReason(''); }}
                            className="rounded-lg border px-3 py-2 text-xs font-semibold"
                            style={{ borderColor: brand.border, color: brand.slate }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Confirmed: retry fulfilment if entries not all done */}
                    {o.payment_status === 'confirmed' &&
                      Number(o.entry_count || 0) > 0 &&
                      (Number(o.pending_entry_count || 0) > 0 ||
                       Number(o.failed_entry_count || 0) > 0 ||
                       Number(o.confirmed_entry_count || 0) < Number(o.entry_count || 0)) && (
                      <button
                        onClick={() => retryFulfilment(o)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#d97706' }}
                      >
                        {isBusy ? 'Retrying…' : 'Retry fulfilment'}
                      </button>
                    )}

                    {/* Confirmed: resend ticket email */}
                    {o.payment_status === 'confirmed' &&
                      Number(o.ticket_entry_count || 0) > 0 &&
                      Number(o.ticket_email_sent_count || 0) < Number(o.ticket_entry_count || 0) && (
                      <button
                        onClick={() => retryFulfilment(o)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#0284c7' }}
                      >
                        {isBusy ? 'Sending…' : Number(o.ticket_email_failed_count || 0) > 0 ? 'Retry ticket email' : 'Send ticket email'}
                      </button>
                    )}

                    {/* Confirmed: undo */}
                    {o.payment_status === 'confirmed' && (
                      <button
                        onClick={() => undoConfirm(o)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#dc2626' }}
                      >
                        {isBusy ? 'Undoing…' : 'Undo confirmation'}
                      </button>
                    )}
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