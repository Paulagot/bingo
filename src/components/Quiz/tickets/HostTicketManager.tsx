// src/components/Quiz/host/HostTicketManager.tsx
import React, { useState, useEffect } from 'react';
import { Check, Clock, ExternalLink, RefreshCw } from 'lucide-react';

interface Ticket {
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

interface HostTicketManagerProps {
  roomId: string;
  clubId: string;
}

export const HostTicketManager: React.FC<HostTicketManagerProps> = ({ roomId, clubId }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'redeemed'>('all');
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, [roomId, clubId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quiz/tickets/room/${roomId}`);
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

      const response = await fetch(`/api/quiz/tickets/${ticketId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedBy: 'current-host-id', // TODO: Get from auth context
          confirmedByName: 'Host Name', // TODO: Get from auth context
          confirmedByRole: 'host',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      // Reload tickets to show updated status
      await loadTickets();
      
    } catch (err) {
      console.error('Failed to confirm payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setConfirming(null);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'pending') return ticket.paymentStatus === 'payment_claimed';
    if (filter === 'confirmed') return ticket.paymentStatus === 'payment_confirmed';
    if (filter === 'redeemed') return ticket.redemptionStatus === 'redeemed';
    return true;
  });

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.paymentStatus === 'payment_claimed').length,
    confirmed: tickets.filter(t => t.paymentStatus === 'payment_confirmed').length,
    redeemed: tickets.filter(t => t.redemptionStatus === 'redeemed').length,
    totalRevenue: tickets
      .filter(t => t.paymentStatus !== 'refunded')
      .reduce((sum, t) => sum + t.totalAmount, 0),
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-700">Loading tickets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Ticket Sales</h2>
        <button
          onClick={loadTickets}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Tickets</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-700">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-700">Confirmed</div>
          <div className="text-2xl font-bold text-green-900">{stats.confirmed}</div>
        </div>
        
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-blue-700">Redeemed</div>
          <div className="text-2xl font-bold text-blue-900">{stats.redeemed}</div>
        </div>
        
        <div className="bg-indigo-50 rounded-lg shadow p-4">
          <div className="text-sm text-indigo-700">Total Revenue</div>
          <div className="text-2xl font-bold text-indigo-900">
            {tickets[0]?.currency || '€'}{stats.totalRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'confirmed', 'redeemed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tickets found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchaser
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Ref
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.purchaserName}
                      </div>
                      <div className="text-sm text-gray-500">{ticket.purchaserEmail}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.playerName}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.currency}{ticket.totalAmount.toFixed(2)}
                      </div>
                      {ticket.extrasTotal > 0 && (
                        <div className="text-xs text-gray-500">
                          (€{ticket.entryFee.toFixed(2)} + €{ticket.extrasTotal.toFixed(2)} extras)
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {ticket.paymentReference}
                      </code>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {/* Payment Status */}
                        <div>
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                          {ticket.paymentStatus === 'payment_confirmed' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Confirmed
                            </span>
                          )}
                        </div>
                        
                        {/* Redemption Status */}
                        {ticket.redemptionStatus === 'redeemed' && (
                          <div className="text-xs text-blue-600">
                            ✓ Redeemed
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                      <div className="text-xs">
                        {new Date(ticket.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {ticket.paymentStatus === 'payment_claimed' ? (
                        <button
                          onClick={() => confirmPayment(ticket.ticketId)}
                          disabled={confirming === ticket.ticketId}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {confirming === ticket.ticketId ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1"></div>
                              Confirming...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </>
                          )}
                        </button>
                      ) : (
                        <a
                          href={`/tickets/status/${ticket.ticketId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                        >
                          View
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};