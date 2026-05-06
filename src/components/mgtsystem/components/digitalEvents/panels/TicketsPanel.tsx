// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/TicketsPanel.tsx
import { useState, useEffect, useMemo } from 'react';
import {  Check, Clock, RefreshCw, QrCode } from 'lucide-react';
import { TicketQRModal } from '../../../../Quiz/dashboard/TicketQRModal';

interface TicketData {
  ticketId: string;
  purchaserName: string;
  purchaserEmail: string;
  playerName: string;
  entryFee: number;
  extrasTotal: number;
  totalAmount: number;
  currency: string;
  paymentStatus: 'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  confirmedAt: string | null;
  redeemedAt: string | null;
}

type ConfirmerRole = 'host' | 'admin';

interface TicketsPanelProps {
  roomId: string;
  roomName?: string;
  confirmer?: { id: string; name: string; role: ConfirmerRole };
  onClose: () => void;
}

export default function TicketsPanel({ roomId, roomName, confirmer, onClose }: TicketsPanelProps) {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'redeemed'>('all');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [qrTicket, setQrTicket] = useState<TicketData | null>(null);

  useEffect(() => { loadTickets(); }, [roomId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/quiz/tickets/room/${roomId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (ticketId: string) => {
    if (!confirmer?.id || !confirmer?.name || !confirmer?.role) {
      setError('Missing confirmer identity.');
      return;
    }
    try {
      setConfirming(ticketId);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/quiz/tickets/${ticketId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          confirmedBy: confirmer.id,
          confirmedByName: confirmer.name,
          confirmedByRole: confirmer.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm payment');
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setConfirming(null);
    }
  };

  const filteredTickets = useMemo(() => tickets.filter((t) => {
    if (filter === 'pending') return t.paymentStatus === 'payment_claimed';
    if (filter === 'confirmed') return t.paymentStatus === 'payment_confirmed';
    if (filter === 'redeemed') return t.redemptionStatus === 'redeemed';
    return true;
  }), [tickets, filter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter((t) => t.paymentStatus === 'payment_claimed').length,
    confirmed: tickets.filter((t) => t.paymentStatus === 'payment_confirmed').length,
    redeemed: tickets.filter((t) => t.redemptionStatus === 'redeemed').length,
    totalRevenue: tickets
      .filter((t) => t.paymentStatus !== 'refunded')
      .reduce((sum, t) => sum + t.totalAmount, 0),
  }), [tickets]);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Stats */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4">
          {roomName && <p className="mb-3 text-xs text-gray-500">{roomName}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: 'Total', value: stats.total, cls: 'bg-gray-50 border-gray-200 text-gray-900' },
              { label: 'Pending', value: stats.pending, cls: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
              { label: 'Confirmed', value: stats.confirmed, cls: 'bg-green-50 border-green-200 text-green-900' },
              { label: 'Redeemed', value: stats.redeemed, cls: 'bg-blue-50 border-blue-200 text-blue-900' },
              {
                label: 'Revenue',
                value: `${tickets[0]?.currency || '€'}${stats.totalRevenue.toFixed(2)}`,
                cls: 'bg-indigo-50 border-indigo-200 text-indigo-900',
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-lg border p-3 ${cls}`}>
                <div className="text-xs mb-1 opacity-70">{label}</div>
                <div className="text-lg font-bold">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 flex-wrap">
          <div className="flex gap-2">
            {(['all', 'pending', 'confirmed', 'redeemed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={loadTickets}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-600">Loading tickets…</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No tickets found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Purchaser', 'Player', 'Amount', 'Ref', 'Status', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.ticketId} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{ticket.purchaserName}</div>
                        <div className="text-xs text-gray-500">{ticket.purchaserEmail}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">{ticket.playerName}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {ticket.currency}{ticket.totalAmount.toFixed(2)}
                        </div>
                        {ticket.extrasTotal > 0 && (
                          <div className="text-xs text-gray-500">
                            ({ticket.currency}{ticket.entryFee.toFixed(2)} + {ticket.currency}{ticket.extrasTotal.toFixed(2)})
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{ticket.paymentReference}</code>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {ticket.paymentStatus === 'payment_claimed' && (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                            <Clock className="mr-1 h-3 w-3" /> Pending
                          </span>
                        )}
                        {ticket.paymentStatus === 'payment_confirmed' && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            <Check className="mr-1 h-3 w-3" /> Confirmed
                          </span>
                        )}
                        {ticket.redemptionStatus === 'redeemed' && (
                          <div className="mt-1 text-xs text-blue-600">✓ Redeemed</div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <button
                              onClick={() => confirmPayment(ticket.ticketId)}
                              disabled={confirming === ticket.ticketId}
                              className="inline-flex items-center rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {confirming === ticket.ticketId ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                              ) : (
                                <Check className="mr-1 h-3 w-3" />
                              )}
                              Confirm
                            </button>
                          )}
                          <button
                            onClick={() => setQrTicket(ticket)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 hover:bg-indigo-100 transition-colors"
                            title="Show QR code"
                          >
                            <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>

      {qrTicket && (
        <TicketQRModal
          ticketId={qrTicket.ticketId}
          playerName={qrTicket.playerName}
          purchaserName={qrTicket.purchaserName}
          onClose={() => setQrTicket(null)}
        />
      )}
    </>
  );
}