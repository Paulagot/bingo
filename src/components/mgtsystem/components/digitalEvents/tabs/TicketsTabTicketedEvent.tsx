// src/components/mgtsystem/components/digitalEvents/tabs/TicketsTabTicketedEvent.tsx
//
// Dedicated Tickets tab for ticketed_event rooms.
// Key differences from the generic TicketsTab:
//   - Shows ticket type column in the list
//   - Stats cards broken down by ticket type (sold + revenue per type)
//   - Purchase link labelled for events not quizzes
//   - No extras column (ticketed events don't have extras)
//   - Skips the ticket-safe payment method check — ticketed events
//     handle payment gating differently

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle, ChevronDown, ChevronUp, Clock, Copy,
  CreditCard, Download, ExternalLink, Loader2, QrCode,
  RefreshCw, Ticket, TicketCheck, Users, X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import { TicketQRModal } from '../../../../Quiz/dashboard/TicketQRModal';
import { useCurrency } from '../../../hooks/useCurrency';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketData {
  ticketId:         string;
  purchaserName:    string;
  purchaserEmail:   string;
  playerName:       string;
  entryFee:         number;
  extrasTotal:      number;
  totalAmount:      number;
  currency:         string;
  paymentStatus:    'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod:    string;
  paymentReference: string;
  createdAt:        string;
  confirmedAt:      string | null;
  redeemedAt:       string | null;
  ticketTypeId?:    string | null;
  ticketTypeName?:  string | null;
}

interface Props {
  room:                    Room;
  hasLinkedPaymentMethods: boolean;
  canUseTicketing:         boolean;
  confirmedBy:             string;
  confirmedByName?:        string;
  config?:                 any;
}

type Filter = 'all' | 'pending' | 'confirmed' | 'redeemed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMaybeJson(value: unknown): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return null;
}

function resolveRoomConfig(room: Room, providedConfig?: any): any {
  const roomAny = room as any;
  return (
    parseMaybeJson(providedConfig) ||
    parseMaybeJson(roomAny.config) ||
    parseMaybeJson(roomAny.config_json) ||
    {}
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function humaniseMethod(value: string | null | undefined): string {
  if (!value) return 'Payment';
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function truncate(value: string | null | undefined, max: number): string {
  if (!value) return '—';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function truncateRef(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ ticket }: { ticket: TicketData }) {
  if (ticket.paymentStatus === 'payment_claimed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5" /> Pending
      </span>
    );
  }
  if (ticket.paymentStatus === 'payment_confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
        <Check className="h-3.5 w-3.5" /> Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
      Refunded
    </span>
  );
}

function TicketLinkQRModal({ ticketUrl, onClose }: { ticketUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(ticketUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102532]/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 p-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Event ticket QR code</h3>
            <p className="mt-1 text-xs text-gray-500">Scan to open the ticket purchase page.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-500 hover:bg-white hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 text-center">
          <div className="inline-block rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <QRCodeCanvas value={ticketUrl} size={220} includeMargin />
          </div>
          <code className="block truncate rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            {ticketUrl}
          </code>
          <button type="button" onClick={copyLink}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#157f85] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6268]">
            {copied ? <><CheckCircle className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy ticket link</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TicketsTabTicketedEvent({
  room, hasLinkedPaymentMethods, canUseTicketing,
  confirmedBy, confirmedByName, config,
}: Props) {
  const [tickets,          setTickets]          = useState<TicketData[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [filter,           setFilter]           = useState<Filter>('all');
  const [typeFilter,       setTypeFilter]       = useState<string>('all');
  const [confirming,       setConfirming]       = useState<string | null>(null);
  const [qrTicket,         setQrTicket]         = useState<TicketData | null>(null);
  const [showLinkQr,       setShowLinkQr]       = useState(false);
  const [copied,           setCopied]           = useState(false);
  const [typeBreakdownOpen, setTypeBreakdownOpen] = useState(false);

  const roomConfig   = useMemo(() => resolveRoomConfig(room, config), [room, config]);
  const { fmt: formatMoney } = useCurrency(roomConfig);

  const ticketUrl        = `${window.location.origin}/tickets/buy/${room.room_id}`;
  const isRoomCompleted  = room.status === 'completed';
  const isRoomCancelled  = room.status === 'cancelled';
  const showPurchaseLink = !isRoomCompleted && !isRoomCancelled;

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/quiz/tickets/room/${room.room_id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [room.room_id]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const confirmPayment = async (ticketId: string) => {
    if (!confirmedBy) { setError('Missing confirmer identity.'); return; }
    try {
      setConfirming(ticketId);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/quiz/tickets/${ticketId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ confirmedBy, confirmedByName: confirmedByName || 'Admin', confirmedByRole: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm');
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(ticketUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const overallStats = useMemo(() => ({
    total:     tickets.length,
    pending:   tickets.filter(t => t.paymentStatus === 'payment_claimed').length,
    confirmed: tickets.filter(t => t.paymentStatus === 'payment_confirmed').length,
    redeemed:  tickets.filter(t => t.redemptionStatus === 'redeemed').length,
    revenue:   tickets.filter(t => t.paymentStatus !== 'refunded').reduce((s, t) => s + Number(t.totalAmount || 0), 0),
  }), [tickets]);

  // Per-ticket-type stats (confirmed tickets only for revenue)
  const typeStats = useMemo(() => {
    const map = new Map<string, { name: string; sold: number; confirmed: number; revenue: number }>();
    for (const t of tickets) {
      const id   = t.ticketTypeId   || 'general';
      const name = t.ticketTypeName || 'General Admission';
      if (!map.has(id)) map.set(id, { name, sold: 0, confirmed: 0, revenue: 0 });
      const entry = map.get(id)!;
      entry.sold++;
      if (t.paymentStatus === 'payment_confirmed') {
        entry.confirmed++;
        entry.revenue += Number(t.totalAmount || 0);
      }
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [tickets]);

  const filtered = useMemo(() => tickets.filter(t => {
    if (filter === 'pending')   { if (t.paymentStatus !== 'payment_claimed') return false; }
    if (filter === 'confirmed') { if (t.paymentStatus !== 'payment_confirmed') return false; }
    if (filter === 'redeemed')  { if (t.redemptionStatus !== 'redeemed') return false; }
    if (typeFilter !== 'all') {
      const id = t.ticketTypeId || 'general';
      if (id !== typeFilter) return false;
    }
    return true;
  }), [tickets, filter, typeFilter]);

  // ── CSV export ───────────────────────────────────────────────────────────
  // Exports the currently-filtered list (so if the user has filtered by
  // type or status, the export matches what they're looking at).
  const exportCsv = useCallback(() => {
    const headers = [
      'Ticket ID', 'Purchaser Name', 'Purchaser Email', 'Ticket Type',
      'Payment Status', 'Redemption Status', 'Payment Method', 'Payment Reference',
      'Amount', 'Currency', 'Purchased At', 'Confirmed At', 'Redeemed At',
    ];

    const escapeCsv = (value: string | number | null | undefined): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filtered.map(t => [
      t.ticketId,
      t.purchaserName,
      t.purchaserEmail,
      t.ticketTypeName || 'General Admission',
      t.paymentStatus,
      t.redemptionStatus,
      t.paymentMethod,
      t.paymentReference,
      t.totalAmount,
      t.currency,
      t.createdAt,
      t.confirmedAt || '',
      t.redeemedAt || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `tickets-${room.room_id.slice(0, 8)}-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filtered, room.room_id]);

  const filterOptions: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all',       label: 'All',       count: overallStats.total },
    { key: 'pending',   label: 'Pending',   count: overallStats.pending },
    { key: 'confirmed', label: 'Confirmed', count: overallStats.confirmed },
    { key: 'redeemed',  label: 'Redeemed',  count: overallStats.redeemed },
  ];

  const showTypeBreakdown = typeStats.length > 1;

  // ── Sorting ──────────────────────────────────────────────────────────────
  type SortKey = 'name' | 'type' | 'amount';
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name')   cmp = a.purchaserName.localeCompare(b.purchaserName);
      if (sortKey === 'type')   cmp = (a.ticketTypeName || 'General Admission').localeCompare(b.ticketTypeName || 'General Admission');
      if (sortKey === 'amount') cmp = a.totalAmount - b.totalAmount;
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return null;
    return sortAsc
      ? <ChevronUp className="h-3 w-3 inline ml-1" />
      : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5 p-5">

        {/* ── Header / overall stats ── */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[#157f85] to-[#0e6268]" />
          <div className="border-b border-gray-100 bg-[rgba(21,127,133,0.04)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,127,133,0.18)] bg-white/80 px-3 py-1 text-xs font-semibold text-[#157f85] shadow-sm">
                  <Ticket className="h-3.5 w-3.5" />
                  Ticketing
                </div>
                <h2 className="mt-3 text-lg font-bold text-[#102532]">Ticket sales and check-in</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                  Share the purchase link, confirm manual payments, and open each attendee's QR code.
                </p>
              </div>
              <button type="button" onClick={loadTickets}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tickets sold</p>
                  <p className="mt-1 text-xl font-bold text-[#102532]">{overallStats.total}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#157f85] shadow-sm">
                  <Ticket className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{overallStats.pending} pending confirmation</p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Confirmed</p>
                  <p className="mt-1 text-xl font-bold text-green-900">{overallStats.confirmed}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-green-700">Payments verified</p>
            </div>

            <div className="rounded-xl border border-[rgba(21,127,133,0.2)] bg-[rgba(21,127,133,0.06)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#157f85]">Checked in</p>
                  <p className="mt-1 text-xl font-bold text-[#102532]">{overallStats.redeemed}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#157f85] shadow-sm">
                  <TicketCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-[#157f85]">Arrived at event</p>
            </div>

            <div className="rounded-xl border border-[#102532]/10 bg-[#102532]/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Revenue</p>
                  <p className="mt-1 text-xl font-bold text-[#102532]">{formatMoney(overallStats.revenue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#102532] shadow-sm">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-[#52636f]">Confirmed ticket value</p>
            </div>
          </div>
        </section>

        {/* ── Per-ticket-type breakdown (collapsible — can get long) ── */}
        {showTypeBreakdown && (
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setTypeBreakdownOpen(o => !o)}
              className="w-full flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-left hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#102532]">By ticket type</h3>
                <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {typeStats.length}
                </span>
              </div>
              {typeBreakdownOpen
                ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </button>
            {typeBreakdownOpen && (
              <div className="divide-y divide-gray-50">
                {typeStats.map(type => (
                  <div key={type.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(21,127,133,0.08)] text-[#157f85]">
                        <Ticket className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 truncate">{type.name}</span>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0 text-sm">
                      <div className="text-right">
                        <p className="font-bold text-[#102532]">{type.sold}</p>
                        <p className="text-xs text-gray-400">sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">{type.confirmed}</p>
                        <p className="text-xs text-gray-400">confirmed</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-bold text-[#157f85]">{formatMoney(type.revenue)}</p>
                        <p className="text-xs text-gray-400">revenue</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Purchase link ── */}
        {showPurchaseLink ? (
          <section className="rounded-xl border border-[rgba(21,127,133,0.18)] bg-[rgba(21,127,133,0.06)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#157f85] text-white shadow-sm">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#102532]">Public ticket purchase link</h3>
                    <p className="text-xs text-[#157f85]">Share this so attendees can buy tickets online.</p>
                  </div>
                </div>
                <code className="block min-w-0 truncate rounded-xl border border-[rgba(21,127,133,0.18)] bg-white px-3 py-2 font-mono text-xs text-gray-700 shadow-sm">
                  {ticketUrl}
                </code>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-shrink-0">
                <button type="button" onClick={() => setShowLinkQr(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(21,127,133,0.25)] bg-white px-4 py-2.5 text-sm font-semibold text-[#157f85] shadow-sm hover:bg-[rgba(21,127,133,0.12)]">
                  <QrCode className="h-4 w-4" /> Show QR
                </button>
                <button type="button" onClick={copyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#157f85] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e6268]">
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Ticket sales are closed — this event is {room.status}.</p>
          </section>
        )}

        {/* ── Ticket list ── */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#102532]">Ticket list</h3>
              <p className="mt-0.5 text-xs text-gray-500">Filter by status or ticket type, then export.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filterOptions.map(({ key, label, count }) => (
                <button key={key} type="button" onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === key
                      ? 'bg-[#157f85] text-white shadow-sm'
                      : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}>
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === key ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              ))}

              {showTypeBreakdown && (
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#157f85]"
                >
                  <option value="all">All types</option>
                  {typeStats.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.06)] px-3 py-1.5 text-xs font-semibold text-[#157f85] hover:bg-[rgba(21,127,133,0.12)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="m-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-[#157f85]" />
              <span className="ml-3 text-sm font-medium text-gray-600">Loading tickets…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                <Ticket className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">No tickets found</p>
              <p className="mt-1 text-xs text-gray-500">
                {filter === 'all' ? 'Share the purchase link so attendees can buy tickets.' : 'Try a different filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => toggleSort('name')}
                      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                    >
                      Attendee<SortIcon active={sortKey === 'name'} />
                    </th>
                    <th
                      onClick={() => toggleSort('type')}
                      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                    >
                      Ticket type<SortIcon active={sortKey === 'type'} />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Actions</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Payment ref</th>
                    <th
                      onClick={() => toggleSort('amount')}
                      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                    >
                      Amount<SortIcon active={sortKey === 'amount'} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sorted.map(ticket => (
                    <tr key={ticket.ticketId} className="hover:bg-[rgba(21,127,133,0.03)]">

                      {/* Attendee */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(21,127,133,0.08)] text-[#157f85]">
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="max-w-[9rem] truncate font-semibold text-[#102532]" title={ticket.purchaserName}>
                              {truncate(ticket.purchaserName, 14)}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-[9rem]" title={ticket.purchaserEmail}>
                              {truncate(ticket.purchaserEmail, 18)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ticket type */}
                      <td className="whitespace-nowrap px-4 py-4">
                        {ticket.ticketTypeName ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.06)] px-2.5 py-1 text-xs font-semibold text-[#157f85]">
                            <Ticket className="h-3 w-3" />
                            {ticket.ticketTypeName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">General</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusPill ticket={ticket} />
                          {ticket.redemptionStatus === 'redeemed' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.06)] px-2.5 py-1 text-xs font-semibold text-[#157f85]">
                              <TicketCheck className="h-3.5 w-3.5" /> Checked in
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not checked in</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <button type="button"
                              onClick={() => confirmPayment(ticket.ticketId)}
                              disabled={confirming === ticket.ticketId}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                              {confirming === ticket.ticketId
                                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                : <Check className="h-3.5 w-3.5" />}
                              Confirm
                            </button>
                          )}
                          <button type="button"
                            onClick={() => setQrTicket(ticket)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(21,127,133,0.18)] bg-[rgba(21,127,133,0.06)] px-3 py-2 text-xs font-bold text-[#157f85] hover:bg-[rgba(21,127,133,0.12)]">
                            <QrCode className="h-3.5 w-3.5" /> QR
                          </button>
                        </div>
                      </td>

                      {/* Payment ref */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <code className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700" title={ticket.paymentReference || undefined}>
                          {truncateRef(ticket.paymentReference)}
                        </code>
                        <div className="mt-1 text-xs text-gray-400">{humaniseMethod(ticket.paymentMethod)}</div>
                      </td>

                      {/* Amount */}
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="font-bold text-[#102532]">{formatMoney(ticket.totalAmount)}</div>
                        <div className="text-xs text-gray-400">{formatDateTime(ticket.createdAt)}</div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showLinkQr && showPurchaseLink && (
        <TicketLinkQRModal ticketUrl={ticketUrl} onClose={() => setShowLinkQr(false)} />
      )}

      {qrTicket && (
        <TicketQRModal
          ticketId={qrTicket.ticketId}
          playerName={qrTicket.purchaserName}
          purchaserName={qrTicket.purchaserName}
          onClose={() => setQrTicket(null)}
        />
      )}
    </>
  );
}