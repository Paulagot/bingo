// src/components/mgtsystem/modals/TicketManagerModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Clock, RefreshCw, Ticket, QrCode } from 'lucide-react';
import { TicketQRModal } from '../../Quiz/dashboard/TicketQRModal';

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

interface TicketManagerModalProps {
  roomId: string;
  roomName?: string;
  onClose: () => void;
  confirmer?: {
    id: string;
    name: string;
    role: ConfirmerRole;
  };
}

export const TicketManagerModal: React.FC<TicketManagerModalProps> = ({
  roomId,
  roomName,
  onClose,
  confirmer,
}) => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'redeemed'>('all');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [qrTicket, setQrTicket] = useState<TicketData | null>(null);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');

      const response = await fetch(`/api/quiz/tickets/room/${roomId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tickets');
      }

      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (ticketId: string) => {
    try {
      setConfirming(ticketId);
      setError(null);

      if (!confirmer?.id || !confirmer?.name || !confirmer?.role) {
        throw new Error('Missing confirmer identity (host/admin).');
      }

      const token = localStorage.getItem('auth_token');

      const response = await fetch(`/api/quiz/tickets/${ticketId}/confirm`, {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      await loadTickets();
    } catch (err) {
      console.error('Failed to confirm payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setConfirming(null);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filter === 'pending') return ticket.paymentStatus === 'payment_claimed';
      if (filter === 'confirmed') return ticket.paymentStatus === 'payment_confirmed';
      if (filter === 'redeemed') return ticket.redemptionStatus === 'redeemed';
      return true;
    });
  }, [tickets, filter]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      pending: tickets.filter((t) => t.paymentStatus === 'payment_claimed').length,
      confirmed: tickets.filter((t) => t.paymentStatus === 'payment_confirmed').length,
      redeemed: tickets.filter((t) => t.redemptionStatus === 'redeemed').length,
      totalRevenue: tickets
        .filter((t) => t.paymentStatus !== 'refunded')
        .reduce((sum, t) => sum + t.totalAmount, 0),
    };
  }, [tickets]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-indigo-600" />
                Ticket Sales
              </h2>
              {roomName && <p className="text-sm text-gray-600 mt-1">{roomName}</p>}
              {confirmer?.name && (
                <p className="text-xs text-gray-500 mt-1">
                  Viewing as: <span className="font-medium">{confirmer.name}</span> ({confirmer.role})
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="text-xs text-yellow-700 mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-700 mb-1">Confirmed</div>
                <div className="text-2xl font-bold text-green-900">{stats.confirmed}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-700 mb-1">Redeemed</div>
                <div className="text-2xl font-bold text-blue-900">{stats.redeemed}</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <div className="text-xs text-indigo-700 mb-1">Revenue</div>
                <div className="text-xl font-bold text-indigo-900">
                  {tickets[0]?.currency || '€'}
                  {stats.totalRevenue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Filters + Refresh */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              {(['all', 'pending', 'confirmed', 'redeemed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={loadTickets}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-700">Loading tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No tickets found for this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchaser</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.ticketId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{ticket.purchaserName}</div>
                          <div className="text-xs text-gray-500">{ticket.purchaserEmail}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{ticket.playerName}</td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {ticket.currency}
                            {ticket.totalAmount.toFixed(2)}
                          </div>
                          {ticket.extrasTotal > 0 && (
                            <div className="text-xs text-gray-500">
                              ({ticket.currency}
                              {ticket.entryFee.toFixed(2)} + {ticket.currency}
                              {ticket.extrasTotal.toFixed(2)})
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{ticket.paymentReference}</code>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                          {ticket.paymentStatus === 'payment_confirmed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Confirmed
                            </span>
                          )}
                          {ticket.redemptionStatus === 'redeemed' && (
                            <div className="text-xs text-blue-600 mt-1">✓ Redeemed</div>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {ticket.paymentStatus === 'payment_claimed' && (
                              <button
                                onClick={() => confirmPayment(ticket.ticketId)}
                                disabled={confirming === ticket.ticketId}
                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {confirming === ticket.ticketId ? (
                                  <>
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                                    Confirming...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirm
                                  </>
                                )}
                              </button>
                            )}
                            {/* QR code button — always shown */}
                            <button
                              onClick={() => setQrTicket(ticket)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                              title="Show ticket QR code"
                            >
                              <QrCode className="h-4 w-4 text-indigo-600" />
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
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal — rendered outside the main modal so it stacks on top */}
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
};