// client/src/components/modals/QuizFinancialReportModal.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Ticket,
  CreditCard,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';

import ReconciliationService from '../services/QuizReconciliationService';

interface ReconciliationData {
  startingEntryFees: number;
  startingExtras: number;
  startingTotal: number;
  adjustmentsNet: number;
  finalTotal: number;
  approvedBy: string;
  approvedAt: string | null;
}

interface TicketStats {
  totalSold: number;
  redeemed: number;
  unredeemed: number;
  totalRevenue: number;
  entryFees: number;
  extras: number;
}

interface PaymentMethodBreakdown {
  method: string;
  // ✅ counts should be "unique players" not ledger rows
  uniquePlayers?: number;
  // Optional but useful for debugging
  records?: number;
  total: number;
}
interface InstantPaymentBreakdown {
  paymentMethodId: number;
  label: string;
  provider: string | null;

  // ✅ player counts (not transactions)
  players: number;
  nonLatePlayers: number;
  latePlayers: number;

  // totals
  total: number;
  nonLateTotal: number;
  lateTotal: number;
}

interface PaymentSection {
  byMethod: PaymentMethodBreakdown[];
  total: number;
  uniquePlayers?: number;
  records?: number;
}

interface FinancialReport {
  reconciliation: ReconciliationData | null;
  tickets: TicketStats;

  // ✅ on-the-night, non-late only
  onNightPayments: PaymentSection;

  // ✅ new: late payments (not included in approved reconciliation)
  latePayments?: PaymentSection;

  instantPaymentBreakdown: InstantPaymentBreakdown[];
}

interface ApiResponse {
  ok: boolean;
  report: FinancialReport;
  error?: string;
}

interface QuizFinancialReportModalProps {
  roomId: string;
  roomName: string;
  currency?: string;
  onClose: () => void;
}

export function QuizFinancialReportModal({
  roomId,
  roomName,
  currency = '€',
  onClose,
}: QuizFinancialReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinancialReport | null>(null);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = (await ReconciliationService.getFinancialReport(roomId)) as ApiResponse;

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      setReport(data.report);
    } catch (err) {
      console.error('Error fetching financial report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = amount ?? 0;
    return `${currency}${safeAmount.toFixed(2)}`;
  };

  const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      instant_payment: 'Instant Payment',
      card: 'Card',
      stripe: 'Stripe',
      pay_admin: 'Pay Admin',
      other: 'Other',
    };
    return labels[method] || method;
  };

  const renderCountLine = (p: PaymentMethodBreakdown) => {
    // Prefer unique players; fall back to records; fall back to count-like display
    const players = p.uniquePlayers;
    const records = p.records;

    if (typeof players === 'number' && typeof records === 'number') {
      return `${players} players • ${records} records`;
    }
    if (typeof players === 'number') {
      return `${players} players`;
    }
    if (typeof records === 'number') {
      return `${records} records`;
    }
    // fallback (older API)
    return `—`;
  };

  const reconciliationCheck = useMemo(() => {
    if (!report?.reconciliation) return null;

    const recon = report.reconciliation;
    const tickets = report.tickets?.totalRevenue ?? 0;
    const onNight = report.onNightPayments?.total ?? 0;
    const adjustments = recon.adjustmentsNet ?? 0;

    const expectedFinal = tickets + onNight + adjustments;
    const approvedFinal = recon.finalTotal ?? 0;
    const delta = expectedFinal - approvedFinal;

    return {
      tickets,
      onNight,
      adjustments,
      expectedFinal,
      approvedFinal,
      delta,
      matches: Math.abs(delta) < 0.01,
    };
  }, [report]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Financial Report</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-50 rounded border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">Error Loading Report</p>
              <p className="text-xs text-red-700">{error || 'Failed to load financial report'}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { reconciliation, tickets, onNightPayments, latePayments, instantPaymentBreakdown } = report;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-bold text-gray-900 truncate">Financial Report</h2>
            <p className="text-xs text-gray-600 truncate">{roomName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto p-4 space-y-3">
          {/* Reconciliation Summary */}
          {reconciliation ? (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-3 border border-indigo-200">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900">Approved Reconciliation Summary</h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Entry Fees</p>
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(reconciliation.startingEntryFees)}
                  </p>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Extras</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(reconciliation.startingExtras)}</p>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Gross Total</p>
                  <p className="text-base font-bold text-green-600">{formatCurrency(reconciliation.startingTotal)}</p>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="flex items-center gap-1">
                    {reconciliation.adjustmentsNet >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <p className="text-xs text-gray-600">Adjustments</p>
                  </div>
                  <p
                    className={`text-base font-bold ${
                      reconciliation.adjustmentsNet >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {reconciliation.adjustmentsNet >= 0 ? '+' : ''}
                    {formatCurrency(reconciliation.adjustmentsNet)}
                  </p>
                </div>
              </div>

              <div className="mt-2 bg-indigo-600 rounded p-2 flex items-center justify-between">
                <p className="text-xs text-indigo-100">Final Total</p>
                <p className="text-xl font-bold text-white">{formatCurrency(reconciliation.finalTotal)}</p>
              </div>

              {reconciliation.approvedAt && (
                <p className="mt-2 text-xs text-gray-600">
                  Approved by <span className="font-semibold">{reconciliation.approvedBy}</span> on{' '}
                  {new Date(reconciliation.approvedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-xs text-yellow-800">No reconciliation data available.</p>
              </div>
            </div>
          )}

          {/* Reconciliation Check */}
          {reconciliation && reconciliationCheck && (
            <div
              className={`rounded-lg p-3 border ${
                reconciliationCheck.matches ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                {reconciliationCheck.matches ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <h3 className="text-sm font-bold text-gray-900">Reconciliation Check</h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Tickets</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(reconciliationCheck.tickets)}</p>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">On-the-Night</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(reconciliationCheck.onNight)}</p>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Adjustments</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(reconciliationCheck.adjustments)}</p>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-xs text-gray-600">Expected Final</p>
                  <p className={`text-base font-bold ${reconciliationCheck.matches ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(reconciliationCheck.expectedFinal)}
                  </p>
                </div>
              </div>

              {!reconciliationCheck.matches && (
                <div className="mt-2 bg-white rounded p-2 border border-red-200 flex items-center justify-between">
                  <p className="text-xs text-red-700">
                    Approved final is {formatCurrency(reconciliationCheck.approvedFinal)} (delta)
                  </p>
                  <p className="text-sm font-bold text-red-700">
                    {reconciliationCheck.delta >= 0 ? '+' : ''}
                    {formatCurrency(reconciliationCheck.delta)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tickets */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Ticket className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-gray-900">Tickets</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600">Sold</p>
                <p className="text-base font-bold text-gray-900">{tickets.totalSold}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600">Redeemed</p>
                <p className="text-base font-bold text-green-600">{tickets.redeemed}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600">Unredeemed</p>
                <p className="text-base font-bold text-orange-600">{tickets.unredeemed}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600">Revenue</p>
                <p className="text-base font-bold text-purple-600">{formatCurrency(tickets.totalRevenue)}</p>
              </div>
            </div>
          </div>

          {/* On-the-Night (non-late) */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-1.5 mb-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900">On-the-Night (Non-late)</h3>
                {(typeof onNightPayments.uniquePlayers === 'number' || typeof onNightPayments.records === 'number') && (
                  <p className="text-xs text-gray-600">
                    {typeof onNightPayments.uniquePlayers === 'number' ? `${onNightPayments.uniquePlayers} players` : ''}
                    {typeof onNightPayments.uniquePlayers === 'number' && typeof onNightPayments.records === 'number' ? ' • ' : ''}
                    {typeof onNightPayments.records === 'number' ? `${onNightPayments.records} records` : ''}
                  </p>
                )}
              </div>
            </div>

            {onNightPayments.byMethod.length > 0 ? (
              <>
                <div className="space-y-1.5 mb-2">
                  {onNightPayments.byMethod.map((payment, idx) => (
                    <div key={idx} className="bg-white rounded p-2 border border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatPaymentMethod(payment.method)}</p>
                        <p className="text-xs text-gray-600">{renderCountLine(payment)}</p>
                      </div>
                      <p className="text-base font-bold text-green-600">{formatCurrency(payment.total)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-green-600 rounded p-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-green-100">Total</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(onNightPayments.total)}</p>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-600">No payments recorded.</p>
            )}
          </div>

          {/* Late Payments (separate from approved reconciliation) */}
          {latePayments && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">Late Payments (Not in Approved Total)</h3>
                  {(typeof latePayments.uniquePlayers === 'number' || typeof latePayments.records === 'number') && (
                    <p className="text-xs text-gray-600">
                      {typeof latePayments.uniquePlayers === 'number' ? `${latePayments.uniquePlayers} players` : ''}
                      {typeof latePayments.uniquePlayers === 'number' && typeof latePayments.records === 'number' ? ' • ' : ''}
                      {typeof latePayments.records === 'number' ? `${latePayments.records} records` : ''}
                    </p>
                  )}
                </div>
              </div>

              {latePayments.byMethod.length > 0 ? (
                <>
                  <div className="space-y-1.5 mb-2">
                    {latePayments.byMethod.map((payment, idx) => (
                      <div key={idx} className="bg-white rounded p-2 border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{formatPaymentMethod(payment.method)}</p>
                          <p className="text-xs text-gray-600">{renderCountLine(payment)}</p>
                        </div>
                        <p className="text-base font-bold text-amber-700">{formatCurrency(payment.total)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-600 rounded p-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-100">Total</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(latePayments.total)}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-600">No late payments recorded.</p>
              )}
            </div>
          )}

          {/* Instant Breakdown */}
          {instantPaymentBreakdown.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Instant Payments</h3>
              </div>
              <div className="space-y-1.5">
                {instantPaymentBreakdown.map((payment, idx) => (
                  <div key={idx} className="bg-white rounded p-2 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{payment.label}</p>
                        {payment.provider && <p className="text-xs text-gray-500 truncate">{payment.provider}</p>}
                      </div>
                      <p className="text-base font-bold text-blue-600 ml-2">{formatCurrency(payment.total)}</p>
                    </div>
                    <p className="text-xs text-gray-600">{payment.count} transactions</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}