// src/components/Quiz/dashboard/TicketsPanelSocket.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, Clock, RefreshCw, Ticket, AlertCircle, QrCode } from 'lucide-react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { TicketQRModal } from './TicketQRModal';

interface TicketData {
  ticketId: string;
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone?: string;
  playerName: string;
  entryFee: number;
  extrasTotal: number;
  totalAmount: number;
  currency: string;
  extras: Array<{ extraId: string; price: number }>;
  paymentStatus: 'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod: string;
  paymentReference: string;
  clubPaymentMethodId?: string;
  purchasedAt: string;
  confirmedAt: string | null;
  confirmedBy?: string;
  redeemedAt: string | null;
  redeemedByPlayerId?: string;
}

interface TicketsPanelSocketProps {
  roomId: string;
}

export const TicketsPanelSocket: React.FC<TicketsPanelSocketProps> = ({ roomId }) => {
  const { socket, connected } = useQuizSocket();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'redeemed'>('all');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [qrTicket, setQrTicket] = useState<TicketData | null>(null);

  const loadTickets = useCallback(() => {
    if (!socket || !connected || !roomId) {
      console.warn('[TicketsPanelSocket] Cannot load - socket not ready');
      return;
    }

    setLoading(true);
    setError(null);

    socket.emit('get_room_tickets', { roomId }, (response: any) => {
      if (response?.ok) {
        setTickets(response.tickets || []);
      } else {
        console.error('[TicketsPanelSocket] Failed to load tickets:', response?.error);
        setError(response?.error || 'Failed to load tickets');
      }
      setLoading(false);
    });
  }, [socket, connected, roomId]);

  useEffect(() => {
    if (socket && connected && roomId) {
      loadTickets();
    }
  }, [socket, connected, roomId, loadTickets]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleTicketPaymentConfirmed = () => loadTickets();
    const handleTicketCreated = () => loadTickets();

    socket.on('ticket_payment_confirmed', handleTicketPaymentConfirmed);
    socket.on('ticket_created', handleTicketCreated);

    return () => {
      socket.off('ticket_payment_confirmed', handleTicketPaymentConfirmed);
      socket.off('ticket_created', handleTicketCreated);
    };
  }, [socket, roomId, loadTickets]);

  const confirmPayment = async (ticketId: string) => {
    if (!socket || !connected) {
      setError('Socket not connected');
      return;
    }

    try {
      setConfirming(ticketId);
      setError(null);

      socket.emit('confirm_ticket_payment', { roomId, ticketId }, (response: any) => {
        if (response?.ok) {
          loadTickets();
        } else {
          setError(response?.error || 'Failed to confirm payment');
        }
        setConfirming(null);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment');
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

  if (!connected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">⚠️ Waiting for connection...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="heading-2">
              <Ticket className="h-5 w-5" />
              <span>Ticket Sales</span>
            </h3>
            <button
              onClick={loadTickets}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-muted rounded-lg p-4 border border-border">
              <div className="text-xs text-fg/60 mb-1">Total Tickets</div>
              <div className="text-2xl font-bold text-fg">{stats.total}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-xs text-yellow-700 mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-xs text-green-700 mb-1">Confirmed</div>
              <div className="text-2xl font-bold text-green-900">{stats.confirmed}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-700 mb-1">Redeemed</div>
              <div className="text-2xl font-bold text-blue-900">{stats.redeemed}</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="text-xs text-indigo-700 mb-1">Total Revenue</div>
              <div className="text-xl font-bold text-indigo-900">
                {tickets[0]?.currency || '€'}
                {stats.totalRevenue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'confirmed', 'redeemed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-muted text-fg/70 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Tickets Table */}
        <div className="bg-muted border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
              <span className="ml-3 text-fg">Loading tickets...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-fg/60">
              {filter === 'all'
                ? 'No tickets have been purchased yet.'
                : `No ${filter} tickets found.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-fg/70 uppercase tracking-wider">
                      Purchaser
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-fg/70 uppercase tracking-wider">
                      Player Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-fg/70 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-fg/70 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-fg/70 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-fg/70 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.ticketId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-fg">{ticket.purchaserName}</div>
                        <div className="text-xs text-fg/60">{ticket.purchaserEmail}</div>
                        {ticket.purchaserPhone && (
                          <div className="text-xs text-fg/50">{ticket.purchaserPhone}</div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-sm text-fg">
                        {ticket.playerName}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-fg">
                          {ticket.currency}{ticket.totalAmount.toFixed(2)}
                        </div>
                        {ticket.extrasTotal > 0 && (
                          <div className="text-xs text-fg/60">
                            Entry: {ticket.currency}{ticket.entryFee.toFixed(2)}<br />
                            Extras: {ticket.currency}{ticket.extrasTotal.toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <div className="font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                            {ticket.paymentReference}
                          </div>
                          <div className="text-fg/50 mt-1">{ticket.paymentMethod}</div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Confirmation
                            </span>
                          )}
                          {ticket.paymentStatus === 'payment_confirmed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Payment Confirmed
                            </span>
                          )}
                          {ticket.redemptionStatus === 'redeemed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              ✓ Ticket Redeemed
                            </span>
                          )}
                          {ticket.redemptionStatus === 'ready' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Ready to Redeem
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <button
                              onClick={() => confirmPayment(ticket.ticketId)}
                              disabled={confirming === ticket.ticketId}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {confirming === ticket.ticketId ? (
                                <>
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                                  Confirming...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Confirm Payment
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

        {/* Info Footer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Using real-time socket connection to manage tickets.
            You can confirm payments and show QR codes without needing to sign in. This list updates automatically.
          </p>
        </div>
      </div>

      {/* QR Modal */}
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

export default TicketsPanelSocket;