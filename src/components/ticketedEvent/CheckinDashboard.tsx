// src/components/ticketedEvent/CheckinDashboard.tsx
//
// Check-in dashboard for ticketed events.
// Accessible to logged-in club users AND door staff via operator token.
// No socket — everything is HTTP with polling.
//
// URL: /ticketed-event/checkin/:roomId?hostId=xxx  (logged-in host)
//      /ticketed-event/checkin/:roomId?token=xxx   (door staff operator token)
//
// UPDATED (settlement guard):
//   - Tickets carry settlementMode + canConfirmManually from the API. Confirm
//     only renders when the server says a human can verify the payment.
//     Stripe/crypto show a read-only "clearing" state instead.
//   - The Payments tab is split: "needs confirming" (actionable) vs "clearing
//     on their own" (read-only). Previously everything pending looked
//     identical and actionable, which is how a declined card got marked paid.
//   - confirmPayment reads the response. It used to swallow every error, so a
//     rejection looked like success until the next refresh.
//   - Collect at door — when an online payment fails, re-collect as cash or
//     card tap instead of pretending the original payment landed.
//
// UPDATED (polling):
//   - isOpen was a useState nothing ever set, so the 30s poll never ran and
//     the dashboard only updated on manual refresh. It's now derived from
//     roomInfo.status.
//   - Polling pauses while the tab is hidden and refreshes immediately when
//     it comes back — a phone in a pocket shouldn't hit the API all night.
//   - loadData takes { silent } so a failed poll no longer replaces the whole
//     screen with the error state. Only initial load and manual refresh do.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Users, CheckCircle2, XCircle, Clock, CreditCard,
  Search, Loader2, Shield, QrCode, RefreshCw,
  X, UserPlus, Link as LinkIcon,
  AlertTriangle, ScanLine, Banknote,
} from 'lucide-react';

import { QRScannerTab } from './QRScannerTab';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettlementMode = 'auto' | 'manual';

interface TicketRow {
  ticketId:         string;
  purchaserName:    string;
  purchaserEmail:   string;
  playerName:       string;
  entryFee:         number;
  extrasTotal?:     number;
  totalAmount:      number;
  currency:         string;
  paymentStatus:    'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod:    string;
  paymentReference: string;
  purchasedAt:      string;
  confirmedAt:      string | null;
  confirmedByName?: string | null;
  redeemedAt:       string | null;
  joinToken:        string;

  // Settlement policy — computed server-side, never derived in the client.
  // Optional so the dashboard still works if the frontend ships first.
  methodLabel?:        string | null;
  settlementMode?:     SettlementMode;
  canConfirmManually?: boolean;
}

interface DoorMethod {
  id:             number;
  methodCategory: string;
  providerName:   string;
  methodLabel:    string;
}

interface RoomInfo {
  roomId:   string;
  hostId:   string;
  status:   string;
  config: {
    entryFee:        string | null;
    fundraisingMode: string;
    currencySymbol:  string;
    hostName:        string | null;
  };
}

interface ScanResult {
  ok:           boolean;
  alreadyUsed?: boolean;
  error?:       string;
  message:      string;
  purchaserName?: string;
  playerName?:    string;
  redeemedAt?:    string;
}

interface Admin {
  id:        string;
  name:      string;
  createdAt: string;
}

type ActiveTab = 'attendees' | 'payments' | 'admins' | 'scanner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// Get auth headers — prefer token param, fall back to localStorage JWT
function getAuthHeaders(token?: string | null): Record<string, string> {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const bearer = token || stored;
  return {
    'Content-Type': 'application/json',
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
  };
}

// Extract token from URL query string
function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

// The API sends these flags. If an older API build is deployed, fall back to
// "manual" so the dashboard keeps behaving exactly as it did before — the
// server-side guard still blocks anything it shouldn't allow.
function isAutoSettled(ticket: TicketRow): boolean {
  return ticket.settlementMode === 'auto';
}

function canConfirm(ticket: TicketRow): boolean {
  if (ticket.paymentStatus !== 'payment_claimed') return false;
  if (ticket.canConfirmManually !== undefined) return ticket.canConfirmManually;
  return !isAutoSettled(ticket);
}

// ─── Payment badge ────────────────────────────────────────────────────────────

const PaymentBadge: React.FC<{ status: TicketRow['paymentStatus'] }> = ({ status }) => {
  if (status === 'payment_confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs font-semibold text-green-800">
        <CheckCircle2 className="h-3 w-3" /> Confirmed
      </span>
    );
  }
  if (status === 'payment_claimed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-xs font-semibold text-yellow-800">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
      Refunded
    </span>
  );
};

// ─── Check-in badge ───────────────────────────────────────────────────────────

const CheckInBadge: React.FC<{ status: TicketRow['redemptionStatus']; redeemedAt?: string | null }> = ({ status, redeemedAt }) => {
  if (status === 'redeemed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(21,127,133,0.1)] border border-[rgba(21,127,133,0.3)] px-2 py-0.5 text-xs font-semibold text-[#157f85]">
        <CheckCircle2 className="h-3 w-3" /> Checked in {redeemedAt ? formatTime(redeemedAt) : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-500">
      Not checked in
    </span>
  );
};

// ─── Awaiting-clearance badge ─────────────────────────────────────────────────
// Shown instead of a Confirm button for Stripe/crypto. There is nothing for a
// person to do here, so the UI shouldn't offer them a button.

const AwaitingBadge: React.FC<{ label?: string | null }> = ({ label }) => (
  <span
    title="This payment confirms on its own once it clears."
    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"
  >
    <Clock className="h-3 w-3" /> Clearing{label ? ` · ${label}` : ''}
  </span>
);

// ─── Collect at door ──────────────────────────────────────────────────────────
// When an online payment doesn't land, take the money in person and move the
// ticket onto a real door method. Keeps the books honest — the ticket ends up
// recorded as cash/card tap, not as a card payment that never cleared.

const CollectAtDoorDialog: React.FC<{
  roomId:  string;
  token:   string | null;
  ticket:  TicketRow;
  sym:     string;
  onClose: () => void;
  onDone:  () => void;
}> = ({ roomId, token, ticket, sym, onClose, onDone }) => {
  const [methods,  setMethods]  = useState<DoorMethod[]>([]);
  const [selected, setSelected] = useState<DoorMethod | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res  = await fetch(`/api/ticketed-event/checkin/${roomId}/door-methods`, {
          headers: getAuthHeaders(token),
        });
        const data = await res.json().catch(() => ({ methods: [] }));
        if (cancelled) return;
        const list: DoorMethod[] = Array.isArray(data.methods) ? data.methods : [];
        setMethods(list);
        setSelected(list[0] ?? null);
      } catch {
        if (!cancelled) setError('Could not load payment methods. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [roomId, token]);

  const handleCollect = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ticketed-event/checkin/${roomId}/tickets/${ticket.ticketId}/collect-at-door`,
        {
          method:  'POST',
          headers: getAuthHeaders(token),
          body:    JSON.stringify({ clubPaymentMethodId: selected.id }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not record the payment.');
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not record the payment.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-[#dce1df] px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-[#102532]">Collect at door</h3>
            <p className="text-xs text-[#52636f] mt-0.5">
              {ticket.purchaserName} · {sym}{ticket.totalAmount.toFixed(2)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-[#52636f]">
            Take the money in person and record it against this ticket. The original
            online payment stays unpaid in the records.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#157f85]" />
            </div>
          ) : methods.length === 0 ? (
            <div className="rounded-lg border border-[#dce1df] bg-[#fbf8f2] px-3 py-4 text-center">
              <p className="text-xs text-[#52636f]">
                No cash or card-tap method set up for this club. Add one in payment
                settings, then collect again.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map(method => {
                const isSelected = selected?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelected(method)}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#157f85] bg-[rgba(21,127,133,0.06)]'
                        : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isSelected ? 'text-[#157f85]' : 'text-[#102532]'}`}>
                      {method.methodLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-[#dce1df] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#dce1df] bg-white px-4 py-2.5 text-sm font-semibold text-[#52636f] hover:bg-[#f6f1e8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCollect}
            disabled={!selected || saving || loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#157f85] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0e6268] disabled:opacity-40 transition-colors"
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Banknote className="h-4 w-4" />}
            Collect {sym}{ticket.totalAmount.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Admins tab ───────────────────────────────────────────────────────────────
// Persists to the backend: GET on mount, POST on add, DELETE on remove.
// This is what feeds config_json.admins, which the Impact tab reads for the
// volunteer count. Door staff added here can also generate operator-token
// invite links.

const AdminsTab: React.FC<{
  roomId: string;
  token:  string | null;
}> = ({ roomId, token }) => {
  const [admins,      setAdmins]      = useState<Admin[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newName,     setNewName]     = useState('');
  const [adding,      setAdding]      = useState(false);
  const [addError,    setAddError]    = useState<string | null>(null);
  const [generating,  setGenerating]  = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [adminTokens, setAdminTokens] = useState<Record<string, string>>({});

  // ── Load existing admins on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/ticketed-event/admins/room/${roomId}`, {
          headers: getAuthHeaders(token),
        });
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.admins)) {
          setAdmins(data.admins);
        }
      } catch {
        // Non-fatal — staff list just starts empty
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [roomId, token]);

  const generateInvite = async (admin: Admin) => {
    if (adminTokens[admin.id]) {
      setExpandedId(admin.id);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/ticketed-event/checkin/${roomId}/operator-token`, {
        method:  'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ staffName: admin.name }),
      });
      const data = await res.json();
      if (data.checkinUrl) {
        setAdminTokens(prev => ({ ...prev, [admin.id]: data.checkinUrl }));
        setExpandedId(admin.id);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = (admin: Admin) => {
    const url = adminTokens[admin.id];
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(admin.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Add admin — persists to backend, only updates state on success ────────
  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/ticketed-event/admins/room/${roomId}`, {
        method:  'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff member');

      setAdmins(prev => [...prev, data.admin]);
      setNewName('');
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add staff member');
    } finally {
      setAdding(false);
    }
  };

  // ── Remove admin — optimistic, rolls back on failure ───────────────────────
  const handleRemove = async (id: string) => {
    const previous = admins;
    setAdmins(prev => prev.filter(a => a.id !== id));
    setAdminTokens(prev => { const n = { ...prev }; delete n[id]; return n; });

    try {
      const res = await fetch(`/api/ticketed-event/admins/room/${roomId}/${id}`, {
        method:  'DELETE',
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error('Failed to remove');
    } catch {
      setAdmins(previous);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Door staff name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) handleAdd(); }}
          disabled={adding}
          className="flex-1 rounded-lg border border-[#dce1df] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#157f85] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0e6268] disabled:opacity-40 transition-colors"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        </button>
      </div>

      {addError && (
        <p className="text-xs text-red-600">{addError}</p>
      )}

      <p className="text-xs text-[#8a9bab]">
        Door staff can scan QR codes and confirm cash, card-tap and transfer payments.
        Card and crypto payments confirm on their own. Staff added here also appear in
        the Impact tab as event volunteers.
      </p>

      {loadingList ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#157f85]" />
        </div>
      ) : admins.length === 0 ? (
        <div className="rounded-xl border border-[#dce1df] bg-[#fbf8f2] p-6 text-center">
          <Users className="mx-auto mb-2 h-10 w-10 text-[#b8c6b0]" />
          <p className="text-sm text-[#8a9bab]">No door staff added yet.</p>
        </div>
      ) : (
        admins.map(admin => {
          const isExpanded = expandedId === admin.id;
          const isCopied   = copiedId   === admin.id;
          const link       = adminTokens[admin.id] || null;

          return (
            <div key={admin.id} className="rounded-xl border border-[#dce1df] overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#fbf8f2]">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-[rgba(21,127,133,0.12)] p-1.5">
                    <Shield className="h-3.5 w-3.5 text-[#157f85]" />
                  </div>
                  <span className="font-semibold text-[#102532] text-sm">{admin.name}</span>
                  <span className="rounded-full border border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] px-2 py-0.5 text-xs text-[#157f85]">
                    Door staff
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => generateInvite(admin)}
                    disabled={generating}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#dce1df] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#52636f] hover:bg-[#f6f1e8] transition-colors"
                  >
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                    {isExpanded ? 'Hide' : 'Invite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(admin.id)}
                    className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-400 hover:bg-red-100 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && link && (
                <div className="border-t border-[#dce1df] bg-white p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="rounded-xl bg-white border border-[#dce1df] p-3 flex-shrink-0">
                      <QRCodeCanvas value={link} size={120} />
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <p className="text-xs text-[#52636f]">
                        Share with <span className="font-semibold text-[#102532]">{admin.name}</span> to let them scan tickets and confirm payments.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={link}
                          readOnly
                          className="flex-1 rounded-lg border border-[#dce1df] px-2 py-1.5 text-xs font-mono text-[#52636f] min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => copyLink(admin)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#157f85] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0e6268] transition-colors flex-shrink-0"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-[#8a9bab]">Valid for 12 hours.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// ─── Stats strip ──────────────────────────────────────────────────────────────

const StatsStrip: React.FC<{
  total: number; checkedIn: number; pending: number; confirmed: number;
}> = ({ total, checkedIn, pending, confirmed }) => (
  <div className="grid grid-cols-4 gap-2">
    {[
      { label: 'Tickets',    value: total,     colour: 'text-[#102532]' },
      { label: 'Checked in', value: checkedIn, colour: 'text-[#157f85]' },
      { label: 'Confirmed',  value: confirmed, colour: 'text-green-600'  },
      { label: 'Pending',    value: pending,   colour: 'text-yellow-600' },
    ].map(({ label, value, colour }) => (
      <div key={label} className="rounded-lg border border-[#dce1df] bg-[#fbf8f2] p-2 text-center">
        <p className={`text-xl font-bold ${colour}`}>{value}</p>
        <p className="text-xs text-[#8a9bab]">{label}</p>
      </div>
    ))}
  </div>
);

// ─── Main dashboard ───────────────────────────────────────────────────────────

interface CheckinDashboardProps {
  roomId:  string;
  hostId?: string;   // passed by CheckinPage; the room is resolved from roomId
}

export const CheckinDashboard: React.FC<CheckinDashboardProps> = ({ roomId }) => {
  const token    = getTokenFromUrl();
  const navigate = useNavigate();

  const [activeTab,    setActiveTab]    = useState<ActiveTab>('attendees');
  const [roomInfo,     setRoomInfo]     = useState<RoomInfo | null>(null);
  const [tickets,      setTickets]      = useState<TicketRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [confirming,   setConfirming]   = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lastScan,     setLastScan]     = useState<ScanResult | null>(null);
  const [collectFor,   setCollectFor]   = useState<TicketRow | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────
  // silent: true is used by the poll. A failed background refresh must not
  // replace a working screen with the full-page error state — door staff
  // would lose the attendee list over one flaky request on venue wifi.
  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setError(null);
      const headers = getAuthHeaders(token);

      const [infoRes, ticketsRes] = await Promise.all([
        fetch(`/api/ticketed-event/checkin/${roomId}/info`,    { headers }),
        fetch(`/api/ticketed-event/checkin/${roomId}/tickets`, { headers }),
      ]);

      if (!infoRes.ok) {
        const d = await infoRes.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load event info');
      }

      const infoData    = await infoRes.json();
      const ticketsData = await ticketsRes.json().catch(() => ({ tickets: [] }));

      setRoomInfo(infoData);
      setTickets(ticketsData.tickets || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load';
      if (silent) {
        console.warn('[CheckinDashboard] background refresh failed:', message);
      } else {
        setError(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [roomId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Polling ──────────────────────────────────────────────────────────────
  // Derived from the room status. This used to be a useState flag nothing ever
  // set, so the interval never started and the dashboard only updated on a
  // manual refresh — stale rows are exactly what leads to someone confirming a
  // payment by hand that the gateway had already settled or declined.
  const isOpen = roomInfo?.status === 'open';

  // Skip a tick if the previous request is still in flight, so a slow
  // connection doesn't stack up overlapping requests.
  const pollInFlight = useRef(false);

  const pollOnce = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (pollInFlight.current) return;
    pollInFlight.current = true;
    try {
      await loadData({ silent: true });
    } finally {
      pollInFlight.current = false;
    }
  }, [loadData]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(pollOnce, 60_000);

    // Refresh the moment staff bring the app back to the foreground — that's
    // when they most need current data, and ticks were skipped while the
    // screen was off.
    const onVisibilityChange = () => {
      if (!document.hidden) pollOnce();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isOpen, pollOnce]);

  // ── Confirm payment ──────────────────────────────────────────────────────
  // Reads the response. The old version swallowed every error, so a rejected
  // confirm looked identical to a successful one until the next refresh.
  const confirmPayment = async (ticketId: string) => {
    setConfirming(ticketId);
    setConfirmError(null);
    try {
      const res = await fetch(
        `/api/ticketed-event/checkin/${roomId}/tickets/${ticketId}/confirm`,
        {
          method:  'PATCH',
          headers: getAuthHeaders(token),
          body:    JSON.stringify({ confirmedByName: token ? 'Door staff' : 'Admin' }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not confirm this payment.');
      await loadData({ silent: true });
    } catch (e: unknown) {
      setConfirmError(e instanceof Error ? e.message : 'Could not confirm this payment.');
      // Refresh anyway so the row reflects whatever the server actually holds
      await loadData({ silent: true });
    } finally {
      setConfirming(null);
    }
  };

  const handleCollected = async () => {
    setCollectFor(null);
    setConfirmError(null);
    await loadData({ silent: true });
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     tickets.length,
    checkedIn: tickets.filter(t => t.redemptionStatus === 'redeemed').length,
    confirmed: tickets.filter(t => t.paymentStatus === 'payment_confirmed').length,
    pending:   tickets.filter(t => t.paymentStatus === 'payment_claimed').length,
  }), [tickets]);

  // Payments needing a human — cash, card tap, transfers. These are the ones
  // where a person checking IS the verification.
  const pendingPayments = useMemo(
    () => tickets.filter(t => canConfirm(t)),
    [tickets]
  );

  // Payments settling elsewhere — Stripe, crypto. Read-only.
  const awaitingGateway = useMemo(
    () => tickets.filter(t => t.paymentStatus === 'payment_claimed' && isAutoSettled(t)),
    [tickets]
  );

  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const q = norm(searchTerm.trim());
    return tickets.filter(t =>
      norm(t.purchaserName).includes(q) ||
      norm(t.playerName).includes(q) ||
      norm(t.purchaserEmail).includes(q)
    );
  }, [tickets, searchTerm]);

  const sym = roomInfo?.config.currencySymbol ?? '€';

  const tabs = [
    { id: 'attendees' as const, label: 'Attendees', icon: <Users className="h-4 w-4" />,      badge: null as number | null },
    { id: 'scanner'   as const, label: 'Scanner',   icon: <ScanLine className="h-4 w-4" />,   badge: null },
    // Badge counts only what a person can actually act on.
    { id: 'payments'  as const, label: 'Payments',  icon: <CreditCard className="h-4 w-4" />, badge: pendingPayments.length > 0 ? pendingPayments.length : null },
    { id: 'admins'    as const, label: 'Staff',     icon: <Shield className="h-4 w-4" />,     badge: null },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#157f85] mx-auto mb-3" />
          <p className="text-sm text-[#52636f]">Loading check-in dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm text-center">
          <AlertTriangle className="h-8 w-8 text-[#e9574f] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#102532]">Failed to load</p>
          <p className="text-xs text-[#52636f] mt-1">{error}</p>
          <button
            type="button"
            onClick={() => loadData()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f1e8]">
      {/* Page header */}
      <div className="bg-white border-b border-[#dce1df] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#102532]">Check-in</h1>
            <p className="text-xs text-[#52636f]">{roomInfo?.config.hostName || 'Event'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
              isOpen
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-[#f6f1e8] text-[#52636f] border-[#dce1df]'
            }`}>
              {isOpen ? '🟢 Check-in open' : roomInfo?.status}
            </span>
            <button
              type="button"
              onClick={() => loadData()}
              className="rounded-lg p-1.5 text-[#8a9bab] hover:bg-[#f6f1e8] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <StatsStrip
          total={stats.total}
          checkedIn={stats.checkedIn}
          pending={stats.pending}
          confirmed={stats.confirmed}
        />

        {/* Confirm error — e.g. a blocked manual confirm on a card payment */}
        {confirmError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{confirmError}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmError(null)}
                className="text-red-400 hover:text-red-600 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Walk-in button */}
        <button
          type="button"
          onClick={() => {
            const walkinUrl = token
              ? `/tickets/walkin/${roomId}?token=${token}`
              : `/tickets/walkin/${roomId}`;
            navigate(walkinUrl);
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#157f85] bg-white px-4 py-3 text-sm font-bold text-[#157f85] hover:bg-[rgba(21,127,133,0.06)] transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add walk-in guest
        </button>

        {/* Last scan result */}
        {lastScan && (
          <div className={`rounded-xl border p-4 ${
            !lastScan.ok
              ? 'border-red-200 bg-red-50'
              : lastScan.alreadyUsed
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-green-200 bg-green-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!lastScan.ok ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : lastScan.alreadyUsed ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                )}
                <div>
                  <p className={`text-sm font-bold ${
                    !lastScan.ok ? 'text-red-800' : lastScan.alreadyUsed ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {lastScan.message}
                  </p>
                  {lastScan.purchaserName && (
                    <p className="text-xs text-gray-600">{lastScan.purchaserName}</p>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setLastScan(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main panel */}
        <div className="bg-white rounded-xl border border-[#dce1df] overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-[#dce1df] overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#157f85] text-[#157f85] bg-[rgba(21,127,133,0.04)]'
                    : 'text-[#52636f] hover:text-[#102532]'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== null && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">

            {/* ── Attendees ── */}
            {activeTab === 'attendees' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a9bab]" />
                  <input
                    type="text"
                    placeholder="Search attendees…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-[#dce1df] py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
                  />
                </div>

                {filteredTickets.length === 0 ? (
                  <div className="rounded-xl border border-[#dce1df] bg-[#fbf8f2] p-6 text-center">
                    <Users className="mx-auto mb-2 h-10 w-10 text-[#b8c6b0]" />
                    <p className="text-sm text-[#8a9bab]">
                      {searchTerm ? 'No attendees match your search.' : 'No tickets yet.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredTickets.map(ticket => (
                      <li key={ticket.ticketId}
                        className={`rounded-xl border p-3 ${
                          ticket.redemptionStatus === 'redeemed'
                            ? 'border-[rgba(21,127,133,0.2)] bg-[rgba(21,127,133,0.04)]'
                            : 'border-[#dce1df] bg-white'
                        }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#102532] text-sm truncate">
                              {ticket.purchaserName}
                            </p>
                            <p className="text-xs text-[#8a9bab] truncate">{ticket.purchaserEmail}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <PaymentBadge status={ticket.paymentStatus} />
                              <CheckInBadge status={ticket.redemptionStatus} redeemedAt={ticket.redeemedAt} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-[#102532]">{sym}{ticket.totalAmount.toFixed(2)}</p>

                            {/* Confirm only where a person can actually verify */}
                            {ticket.paymentStatus === 'payment_claimed' && (
                              canConfirm(ticket) ? (
                                <button
                                  type="button"
                                  onClick={() => confirmPayment(ticket.ticketId)}
                                  disabled={confirming === ticket.ticketId}
                                  className="mt-1 inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {confirming === ticket.ticketId
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <CheckCircle2 className="h-3 w-3" />}
                                  Confirm
                                </button>
                              ) : (
                                <div className="mt-1 flex flex-col items-end gap-1">
                                  <AwaitingBadge label={ticket.methodLabel} />
                                  <button
                                    type="button"
                                    onClick={() => setCollectFor(ticket)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#dce1df] bg-white px-2 py-1 text-xs font-semibold text-[#52636f] hover:bg-[#f6f1e8] transition-colors"
                                  >
                                    <Banknote className="h-3 w-3" />
                                    Collect at door
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── Scanner ── */}
            {activeTab === 'scanner' && (
              <QRScannerTab
                roomId={roomId}
                token={token}
              />
            )}

            {/* ── Payments ── */}
            {activeTab === 'payments' && (
              <div className="space-y-5">

                {/* Needs a person */}
                <div className="space-y-3">
                  {pendingPayments.length === 0 ? (
                    <div className="rounded-xl border border-[#dce1df] bg-[#fbf8f2] p-6 text-center">
                      <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-400" />
                      <p className="font-semibold text-[#102532] text-sm">Nothing to confirm</p>
                      <p className="mt-1 text-xs text-[#8a9bab]">
                        Every payment you can verify has been confirmed.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                        <strong>{pendingPayments.length}</strong> payment{pendingPayments.length !== 1 ? 's' : ''} need confirming
                      </div>
                      <ul className="space-y-2">
                        {pendingPayments.map(ticket => (
                          <li key={ticket.ticketId} className="rounded-xl border border-[#dce1df] bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#102532] text-sm truncate">{ticket.purchaserName}</p>
                                <p className="text-xs text-[#8a9bab] mt-0.5 truncate">
                                  {ticket.methodLabel || ticket.paymentMethod} · {ticket.paymentReference || 'No ref'}
                                </p>
                                <p className="text-sm font-bold text-[#102532] mt-1">{sym}{ticket.totalAmount.toFixed(2)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => confirmPayment(ticket.ticketId)}
                                disabled={confirming === ticket.ticketId}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 flex-shrink-0"
                              >
                                {confirming === ticket.ticketId
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Confirm
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {/* Settling elsewhere — read-only, no Confirm button anywhere */}
                {awaitingGateway.length > 0 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-sm font-semibold text-blue-900">
                        {awaitingGateway.length} clearing on their own
                      </p>
                      <p className="text-xs text-blue-800 mt-0.5">
                        Card and crypto payments confirm automatically once they clear.
                        Nothing to do here. If one fails and the guest pays in person,
                        use Collect at door.
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {awaitingGateway.map(ticket => (
                        <li key={ticket.ticketId} className="rounded-xl border border-[#dce1df] bg-[#fbf8f2] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#102532] text-sm truncate">{ticket.purchaserName}</p>
                              <p className="text-xs text-[#8a9bab] mt-0.5 truncate">
                                {ticket.methodLabel || ticket.paymentMethod}
                              </p>
                              <p className="text-sm font-bold text-[#102532] mt-1">{sym}{ticket.totalAmount.toFixed(2)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <AwaitingBadge />
                              <button
                                type="button"
                                onClick={() => setCollectFor(ticket)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#dce1df] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#52636f] hover:bg-white/60 transition-colors"
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                Collect at door
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Staff ── */}
            {activeTab === 'admins' && (
              <AdminsTab roomId={roomId} token={token} />
            )}

          </div>
        </div>
      </div>

      {/* Collect at door */}
      {collectFor && (
        <CollectAtDoorDialog
          roomId={roomId}
          token={token}
          ticket={collectFor}
          sym={sym}
          onClose={() => setCollectFor(null)}
          onDone={handleCollected}
        />
      )}
    </div>
  );
};

export default CheckinDashboard;