// client/src/components/modals/QuizFinancialReportModal.tsx
import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
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
  Printer,
  Users,
  Scale,
} from 'lucide-react';

import ReconciliationService from '../services/QuizReconciliationService';

interface ReconciliationData {
  fundraisingMode?: 'fixed_fee' | 'donation';
  startingEntryFees: number;
  startingExtras: number;
  startingTotal: number;
  adjustmentsNet: number;
  finalTotal: number;
  approvedBy: string;
  approvedAt: string | null;
}

interface TicketPaymentMethodBreakdown {
  method: string;
  tickets: number;
  entryFees: number;
  extras: number;
  total: number;
}

interface TicketStats {
  totalSold: number;
  redeemed: number;
  unredeemed: number;
  totalRevenue: number;
  entryFees: number;
  extras: number;
  byMethod?: TicketPaymentMethodBreakdown[];
}

interface PaymentMethodBreakdown {
  method: string;
  uniquePlayers?: number;
  records?: number;
  total: number;
}

interface InstantPaymentBreakdown {
  paymentMethodId: number | null;
  label: string;
  provider: string | null;
  players: number;
  nonLatePlayers: number;
  latePlayers: number;
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

interface OutstandingByStatus {
  status: 'expected' | 'claimed' | 'disputed' | string;
  uniquePlayers: number;
  records: number;
  total: number;
}

interface OutstandingPayments {
  byStatus: OutstandingByStatus[];
  uniquePlayers: number;
  records: number;
  total: number;
}

interface WriteOffRow {
  playerId: string;
  playerName: string;
  records: number;
  total: number;
  adminNotes: string | null;
  updatedAt: string | null;
}

interface WriteOffs {
  rows: WriteOffRow[];
  uniquePlayers: number;
  records: number;
  total: number;
}

interface OverallPaymentMethodRow {
  method: string;
  tickets: number;
  onNight: number;
  late: number;
  total: number;
}

interface FinancialReport {
  reconciliation: ReconciliationData | null;
  tickets: TicketStats;
  onNightPayments: PaymentSection;
  latePayments?: PaymentSection;
  instantPaymentBreakdown: InstantPaymentBreakdown[];
  outstandingPayments?: OutstandingPayments;
  writeOffs?: WriteOffs;
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

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCurrentDocumentStyles() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');
}

function MetricCard({
  label,
  value,
  tone = 'gray',
  helper,
}: {
  label: string;
  value: string | number;
  tone?: 'gray' | 'indigo' | 'green' | 'amber' | 'orange' | 'red' | 'purple' | 'blue';
  helper?: string;
}) {
  const toneMap = {
    gray: 'border-gray-200 bg-white text-gray-950',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    green: 'border-green-200 bg-green-50 text-green-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    orange: 'border-orange-200 bg-orange-50 text-orange-950',
    red: 'border-red-200 bg-red-50 text-red-950',
    purple: 'border-purple-200 bg-purple-50 text-purple-950',
    blue: 'border-blue-200 bg-blue-50 text-blue-950',
  };

  const labelMap = {
    gray: 'text-gray-600',
    indigo: 'text-indigo-700',
    green: 'text-green-700',
    amber: 'text-amber-700',
    orange: 'text-orange-700',
    red: 'text-red-700',
    purple: 'text-purple-700',
    blue: 'text-blue-700',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${labelMap[tone]}`}>
        {label}
      </p>
      <p className="mt-1 text-lg font-black">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-gray-600">{helper}</p>}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600">
      {children}
    </div>
  );
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
    const safeAmount = Number(amount ?? 0);
    return `${currency}${safeAmount.toFixed(2)}`;
  };

  const formatPaymentMethod = (method: string | null | undefined) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      instant_payment: 'Instant Payment',
      instant: 'Instant Payment',
      revolut: 'Revolut',
      card: 'Card',
      card_tap: 'Card Tap',
      stripe: 'Stripe',
      pay_admin: 'Pay Admin',
      pay_host: 'Pay Host',
      crypto: 'Crypto',
      web3: 'Web3',
      other: 'Other',
      unknown: 'Unknown',
    };

    if (!method) return 'Unknown';
    return labels[method] || method.replace(/_/g, ' ');
  };

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      expected: 'Expected / Pay Later',
      claimed: 'Claimed, Not Confirmed',
      disputed: 'Disputed',
      written_off: 'Written Off',
      confirmed: 'Confirmed',
    };

    return labels[status] || status.replace(/_/g, ' ');
  };

  const renderCountLine = (p: PaymentMethodBreakdown) => {
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

    return '—';
  };

  const reconciliationCheck = useMemo(() => {
    if (!report?.reconciliation) return null;

    const recon = report.reconciliation;
    const ticketTotal = report.tickets?.totalRevenue ?? 0;
    const onNightTotal = report.onNightPayments?.total ?? 0;
    const adjustments = recon.adjustmentsNet ?? 0;

    const expectedFinal = ticketTotal + onNightTotal + adjustments;
    const approvedFinal = recon.finalTotal ?? 0;
    const delta = expectedFinal - approvedFinal;

    return {
      ticketTotal,
      onNightTotal,
      adjustments,
      expectedFinal,
      approvedFinal,
      delta,
      matches: Math.abs(delta) < 0.01,
    };
  }, [report]);

  const finalKnownPosition = useMemo(() => {
    if (!report?.reconciliation) return null;

    const approvedTotal = report.reconciliation.finalTotal ?? 0;
    const lateTotal = report.latePayments?.total ?? 0;
    const outstandingTotal = report.outstandingPayments?.total ?? 0;
    const writtenOffTotal = report.writeOffs?.total ?? 0;

    return {
      approvedTotal,
      lateTotal,
      collectedIncludingLate: approvedTotal + lateTotal,
      outstandingTotal,
      writtenOffTotal,
    };
  }, [report]);

  const participationSummary = useMemo(() => {
    if (!report) return null;

    const ticketPlayers = report.tickets?.totalSold ?? 0;
    const onNightPlayers = report.onNightPayments?.uniquePlayers ?? 0;
    const latePlayers = report.latePayments?.uniquePlayers ?? 0;
    const outstandingPlayers = report.outstandingPayments?.uniquePlayers ?? 0;
    const writeOffPlayers = report.writeOffs?.uniquePlayers ?? 0;

    return {
      ticketPlayers,
      onNightPlayers,
      latePlayers,
      outstandingPlayers,
      writeOffPlayers,
      totalPositions:
        ticketPlayers + onNightPlayers + latePlayers + outstandingPlayers + writeOffPlayers,
    };
  }, [report]);

  const overallPaymentMethods = useMemo<OverallPaymentMethodRow[]>(() => {
    if (!report) return [];

    const map = new Map<string, OverallPaymentMethodRow>();

    const ensure = (method: string | null | undefined) => {
      const key = method || 'unknown';

      if (!map.has(key)) {
        map.set(key, {
          method: key,
          tickets: 0,
          onNight: 0,
          late: 0,
          total: 0,
        });
      }

      return map.get(key)!;
    };

    for (const row of report.tickets?.byMethod || []) {
      const item = ensure(row.method);
      item.tickets += Number(row.total || 0);
    }

    for (const row of report.onNightPayments?.byMethod || []) {
      const item = ensure(row.method);
      item.onNight += Number(row.total || 0);
    }

    for (const row of report.latePayments?.byMethod || []) {
      const item = ensure(row.method);
      item.late += Number(row.total || 0);
    }

    for (const item of map.values()) {
      item.total = item.tickets + item.onNight + item.late;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [report]);

  const getPrintableReportHtml = () => {
    const reportEl = document.getElementById('quiz-financial-report-content');

    if (!reportEl) {
      throw new Error('Printable report content was not found.');
    }

    const styles = getCurrentDocumentStyles();

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Financial Report - ${escapeHtml(roomName)}</title>
          ${styles}
          <style>
            html,
            body {
              background: #ffffff !important;
              min-height: auto !important;
              height: auto !important;
              overflow: visible !important;
            }

            body {
              margin: 0 !important;
              padding: 0 !important;
              color: #111827 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            #print-root {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            #print-root .print-shell {
              max-width: 980px !important;
              width: 100% !important;
              margin: 0 auto !important;
              padding: 24px !important;
              background: #ffffff !important;
            }

            #print-root .print-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 14px !important;
            }

            #print-root .no-print {
              display: none !important;
            }

            #print-root .fixed,
            #print-root .absolute,
            #print-root .sticky {
              position: static !important;
            }

            #print-root .overflow-y-auto,
            #print-root .overflow-auto,
            #print-root .overflow-hidden {
              overflow: visible !important;
            }

            #print-root .max-h-\\[95vh\\],
            #print-root .max-h-screen,
            #print-root .h-screen {
              max-height: none !important;
              height: auto !important;
            }

            @media print {
              @page {
                size: A4;
                margin: 14mm;
              }

              html,
              body {
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: #ffffff !important;
              }

              body {
                padding: 0 !important;
              }

              #print-root .print-shell {
                max-width: none !important;
                width: 100% !important;
                padding: 0 !important;
              }

              #print-root .print-card {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              #print-root .print-title-card {
                break-after: avoid !important;
                page-break-after: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div id="print-root">
            <div class="print-shell">
              ${reportEl.innerHTML}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    try {
      const html = getPrintableReportHtml();
      const printWindow = window.open('', '_blank', 'width=1100,height=850');

      if (!printWindow) {
        setError('Pop-up blocked. Please allow pop-ups to print or save this report as PDF.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      const runPrint = () => {
        printWindow.focus();

        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      printWindow.onload = runPrint;

      setTimeout(() => {
        if (!printWindow.closed) runPrint();
      }, 1000);
    } catch (err) {
      console.error('[FinancialReport] Print failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to prepare report for printing.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
          <p className="text-center text-sm text-gray-600">Loading financial report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Financial Report</h2>
            <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">Error Loading Report</p>
              <p className="text-xs text-red-700">{error || 'Failed to load financial report'}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    reconciliation,
    tickets,
    onNightPayments,
    latePayments,
    instantPaymentBreakdown,
    outstandingPayments,
    writeOffs,
  } = report;

  const isDonationRoom = reconciliation?.fundraisingMode === 'donation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white p-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-950">Financial Report</h2>
            <p className="truncate text-sm text-gray-600">{roomName}</p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Report content */}
        <div className="overflow-y-auto p-4 sm:p-6">
          <div id="quiz-financial-report-content" className="mx-auto max-w-5xl space-y-4">
            {/* Printable title */}
            <div className="print-card print-title-card rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-950">Financial Report</h1>
                  <p className="mt-1 text-sm text-gray-600">{roomName}</p>
                  <p className="mt-2 max-w-3xl text-sm text-gray-700">
                    This report summarises confirmed income, approved reconciliation totals,
                    late receipts, outstanding balances, written-off amounts, and payment
                    method breakdowns for this quiz event.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-gray-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Room ID
                  </div>
                  <div className="mt-1 font-bold text-gray-950">{roomId}</div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            {finalKnownPosition && (
              <div className="print-card rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <SectionHeader
                  icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
                  title="Financial Summary"
                  subtitle="Approved reconciliation, late receipts, outstanding balances, and write-offs."
                />

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard
                    label="Approved total"
                    value={formatCurrency(finalKnownPosition.approvedTotal)}
                    tone="indigo"
                    helper="Signed-off amount"
                  />
                  <MetricCard
                    label="Late received"
                    value={formatCurrency(finalKnownPosition.lateTotal)}
                    tone="amber"
                    helper="Collected after approval"
                  />
                  <MetricCard
                    label="Still outstanding"
                    value={formatCurrency(finalKnownPosition.outstandingTotal)}
                    tone="orange"
                    helper="Not yet resolved"
                  />
                  <MetricCard
                    label="Written off"
                    value={formatCurrency(finalKnownPosition.writtenOffTotal)}
                    tone="red"
                    helper="Closed as not paid"
                  />
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-200">
                      Final known collected total
                    </p>
                    <p className="text-xs text-gray-400">
                      Approved total plus late payments received after approval.
                    </p>
                  </div>
                  <p className="text-2xl font-black">
                    {formatCurrency(finalKnownPosition.collectedIncludingLate)}
                  </p>
                </div>
              </div>
            )}

            {/* Approved Reconciliation */}
            {reconciliation ? (
              <div className="print-card rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <SectionHeader
                  icon={<FileText className="h-5 w-5 text-indigo-600" />}
                  title="Approved Reconciliation Summary"
                  subtitle="This is the amount signed off during reconciliation."
                />

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard
                    label={isDonationRoom ? 'Donations' : 'Entry fees'}
                    value={formatCurrency(reconciliation.startingEntryFees)}
                    tone="gray"
                  />
                  <MetricCard
                    label="Extras"
                    value={formatCurrency(reconciliation.startingExtras)}
                    tone="gray"
                  />
                  <MetricCard
                    label="Adjustments"
                    value={formatCurrency(reconciliation.adjustmentsNet)}
                    tone={reconciliation.adjustmentsNet >= 0 ? 'green' : 'red'}
                  />
                  <MetricCard
                    label="Approved final"
                    value={formatCurrency(reconciliation.finalTotal)}
                    tone="indigo"
                  />
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-indigo-100 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-gray-950">
                      Approved by {reconciliation.approvedBy || '—'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {reconciliation.approvedAt
                        ? new Date(reconciliation.approvedAt).toLocaleString()
                        : 'No approval date recorded'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="print-card rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <SectionHeader
                  icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
                  title="Reconciliation Not Approved"
                  subtitle="The approved reconciliation summary is not available yet."
                />
              </div>
            )}

            {/* Reconciliation Check */}
            {reconciliationCheck && (
              <div
                className={`print-card rounded-2xl border p-4 ${
                  reconciliationCheck.matches
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <SectionHeader
                  icon={
                    reconciliationCheck.matches ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )
                  }
                  title="Approved Reconciliation Check"
                  subtitle="Tickets + on-the-night confirmed payments + adjustments should match the approved final total."
                />

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <MetricCard
                    label="Tickets"
                    value={formatCurrency(reconciliationCheck.ticketTotal)}
                    tone="gray"
                  />
                  <MetricCard
                    label="On the night"
                    value={formatCurrency(reconciliationCheck.onNightTotal)}
                    tone="gray"
                  />
                  <MetricCard
                    label="Adjustments"
                    value={formatCurrency(reconciliationCheck.adjustments)}
                    tone={reconciliationCheck.adjustments >= 0 ? 'green' : 'red'}
                  />
                  <MetricCard
                    label="Expected"
                    value={formatCurrency(reconciliationCheck.expectedFinal)}
                    tone="purple"
                  />
                  <MetricCard
                    label="Difference"
                    value={formatCurrency(reconciliationCheck.delta)}
                    tone={reconciliationCheck.matches ? 'green' : 'red'}
                  />
                </div>

                <div
                  className={`mt-3 rounded-xl p-3 text-sm font-semibold ${
                    reconciliationCheck.matches
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {reconciliationCheck.matches
                    ? 'Balanced: approved total matches the channel breakdown.'
                    : 'Needs review: approved total does not match the channel breakdown.'}
                </div>
              </div>
            )}

            {/* Player / Payment Position Check */}
            {participationSummary && (
              <div className="print-card rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <SectionHeader
                  icon={<Users className="h-5 w-5 text-gray-700" />}
                  title="Player / Payment Position Check"
                  subtitle="A count-based view of how players or payment positions are represented."
                />

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <MetricCard
                    label="Tickets"
                    value={participationSummary.ticketPlayers}
                    tone="purple"
                  />
                  <MetricCard
                    label="On night paid"
                    value={participationSummary.onNightPlayers}
                    tone="green"
                  />
                  <MetricCard
                    label="Late paid"
                    value={participationSummary.latePlayers}
                    tone="amber"
                  />
                  <MetricCard
                    label="Outstanding"
                    value={participationSummary.outstandingPlayers}
                    tone="orange"
                  />
                  <MetricCard
                    label="Written off"
                    value={participationSummary.writeOffPlayers}
                    tone="red"
                  />
                </div>
              </div>
            )}

            {/* Overall Payment Method Summary */}
            <div className="print-card rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <SectionHeader
                icon={<CreditCard className="h-5 w-5 text-gray-700" />}
                title="Overall Payment Method Summary"
                subtitle="Combined view across advance tickets, on-the-night payments, and late payments."
              />

              {overallPaymentMethods.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="hidden grid-cols-5 gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600 md:grid">
                    <div>Method</div>
                    <div className="text-right">Tickets</div>
                    <div className="text-right">On night</div>
                    <div className="text-right">Late</div>
                    <div className="text-right">Total</div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {overallPaymentMethods.map((row) => (
                      <div
                        key={row.method}
                        className="grid gap-2 px-3 py-3 text-sm md:grid-cols-5 md:items-center"
                      >
                        <div className="font-bold text-gray-950">
                          {formatPaymentMethod(row.method)}
                        </div>

                        <div className="flex justify-between md:block md:text-right">
                          <span className="text-xs font-semibold text-gray-500 md:hidden">
                            Tickets
                          </span>
                          <span>{formatCurrency(row.tickets)}</span>
                        </div>

                        <div className="flex justify-between md:block md:text-right">
                          <span className="text-xs font-semibold text-gray-500 md:hidden">
                            On night
                          </span>
                          <span>{formatCurrency(row.onNight)}</span>
                        </div>

                        <div className="flex justify-between md:block md:text-right">
                          <span className="text-xs font-semibold text-gray-500 md:hidden">
                            Late
                          </span>
                          <span>{formatCurrency(row.late)}</span>
                        </div>

                        <div className="flex justify-between font-black text-indigo-700 md:block md:text-right">
                          <span className="text-xs font-semibold text-gray-500 md:hidden">
                            Total
                          </span>
                          <span>{formatCurrency(row.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState>No payment method summary available.</EmptyState>
              )}
            </div>

            {/* Channel breakdown: Tickets and On-night */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Tickets */}
              <div className="print-card rounded-2xl border border-purple-200 bg-purple-50 p-4">
                <SectionHeader
                  icon={<Ticket className="h-5 w-5 text-purple-600" />}
                  title="Advance Ticket Sales"
                  subtitle="Confirmed ticket payments sold before the event."
                />

                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Sold" value={tickets.totalSold} tone="gray" />
                  <MetricCard label="Redeemed" value={tickets.redeemed} tone="green" />
                  <MetricCard label="Unredeemed" value={tickets.unredeemed} tone="orange" />
                  <MetricCard
                    label="Revenue"
                    value={formatCurrency(tickets.totalRevenue)}
                    tone="purple"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MetricCard
                    label={isDonationRoom ? 'Donation portion' : 'Entry portion'}
                    value={formatCurrency(tickets.entryFees)}
                    tone="gray"
                  />
                  <MetricCard
                    label="Extras portion"
                    value={formatCurrency(tickets.extras)}
                    tone="gray"
                  />
                </div>

                {tickets.byMethod && tickets.byMethod.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-purple-100 bg-white">
                    <div className="border-b border-purple-100 bg-purple-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-purple-800">
                      Ticket payment methods
                    </div>

                    <div className="divide-y divide-purple-50">
                      {tickets.byMethod.map((row) => (
                        <div
                          key={row.method}
                          className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-4 sm:items-center"
                        >
                          <div className="font-bold text-gray-950">
                            {formatPaymentMethod(row.method)}
                          </div>

                          <div className="text-gray-700 sm:text-right">
                            {row.tickets} tickets
                          </div>

                          <div className="text-gray-700 sm:text-right">
                            Entry {formatCurrency(row.entryFees)} · Extras{' '}
                            {formatCurrency(row.extras)}
                          </div>

                          <div className="font-black text-purple-700 sm:text-right">
                            {formatCurrency(row.total)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyState>No ticket payment method breakdown available.</EmptyState>
                  </div>
                )}
              </div>

              {/* On Night */}
              <div className="print-card rounded-2xl border border-green-200 bg-green-50 p-4">
                <SectionHeader
                  icon={<CreditCard className="h-5 w-5 text-green-600" />}
                  title="On-the-Night Confirmed Payments"
                  subtitle="Confirmed non-late payments collected during the event."
                />

                {onNightPayments.byMethod.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {onNightPayments.byMethod.map((payment, idx) => (
                        <div
                          key={`${payment.method}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-white p-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-950">
                              {formatPaymentMethod(payment.method)}
                            </p>
                            <p className="text-xs text-gray-600">{renderCountLine(payment)}</p>
                          </div>
                          <p className="text-base font-black text-green-700">
                            {formatCurrency(payment.total)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-green-600 p-3 text-white">
                      <p className="text-sm font-semibold">On-the-night total</p>
                      <p className="text-xl font-black">
                        {formatCurrency(onNightPayments.total)}
                      </p>
                    </div>
                  </>
                ) : (
                  <EmptyState>No on-the-night payments recorded.</EmptyState>
                )}
              </div>
            </div>

            {/* Late payments */}
            {latePayments && (
              <div className="print-card rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <SectionHeader
                  icon={<Clock className="h-5 w-5 text-amber-600" />}
                  title="Late Payments Received After Approval"
                  subtitle="Late payments are shown separately and are not part of the approved reconciliation total."
                />

                {latePayments.byMethod.length > 0 ? (
                  <>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {latePayments.byMethod.map((payment, idx) => (
                        <div
                          key={`${payment.method}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-950">
                              {formatPaymentMethod(payment.method)}
                            </p>
                            <p className="text-xs text-gray-600">{renderCountLine(payment)}</p>
                          </div>
                          <p className="text-base font-black text-amber-700">
                            {formatCurrency(payment.total)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-600 p-3 text-white">
                      <p className="text-sm font-semibold">Late payment total</p>
                      <p className="text-xl font-black">
                        {formatCurrency(latePayments.total)}
                      </p>
                    </div>
                  </>
                ) : (
                  <EmptyState>No late payments recorded.</EmptyState>
                )}
              </div>
            )}

            {/* Instant payment accounts */}
            <div className="print-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <SectionHeader
                icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                title="Instant Payment Accounts / Methods"
                subtitle="Breakdown of instant payments by saved club payment method, including on-night and late receipts."
              />

              {instantPaymentBreakdown.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
                  <div className="hidden grid-cols-5 gap-3 border-b border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-800 md:grid">
                    <div>Account / Method</div>
                    <div>Provider</div>
                    <div className="text-right">On night</div>
                    <div className="text-right">Late</div>
                    <div className="text-right">Total</div>
                  </div>

                  <div className="divide-y divide-blue-50">
                    {instantPaymentBreakdown.map((item, idx) => (
                      <div
                        key={`${item.paymentMethodId ?? 'unknown'}-${idx}`}
                        className="grid gap-2 px-3 py-3 text-sm md:grid-cols-5 md:items-center"
                      >
                        <div>
                          <p className="font-bold text-gray-950">{item.label}</p>
                          <p className="text-xs text-gray-600">{item.players} players total</p>
                        </div>

                        <div className="text-gray-700">{item.provider || '—'}</div>

                        <div className="md:text-right">
                          <p className="font-bold text-gray-950">
                            {formatCurrency(item.nonLateTotal)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.nonLatePlayers} players
                          </p>
                        </div>

                        <div className="md:text-right">
                          <p className="font-bold text-gray-950">
                            {formatCurrency(item.lateTotal)}
                          </p>
                          <p className="text-xs text-gray-500">{item.latePlayers} players</p>
                        </div>

                        <div className="md:text-right">
                          <p className="font-black text-blue-700">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState>No instant payment account breakdown available.</EmptyState>
              )}
            </div>

            {/* Outstanding and Write-offs */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Outstanding */}
              <div className="print-card rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <SectionHeader
                  icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
                  title="Outstanding / Unresolved Payments"
                  subtitle="Amounts not included in received totals."
                />

                {outstandingPayments && outstandingPayments.total > 0 ? (
                  <>
                    <div className="space-y-2">
                      {outstandingPayments.byStatus.map((row) => (
                        <div
                          key={row.status}
                          className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-950">
                              {formatStatus(row.status)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {row.uniquePlayers} players • {row.records} records
                            </p>
                          </div>
                          <p className="text-base font-black text-orange-700">
                            {formatCurrency(row.total)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-600 p-3 text-white">
                      <p className="text-sm font-semibold">Total outstanding</p>
                      <p className="text-xl font-black">
                        {formatCurrency(outstandingPayments.total)}
                      </p>
                    </div>
                  </>
                ) : (
                  <EmptyState>No outstanding unresolved payments.</EmptyState>
                )}
              </div>

              {/* Write-offs */}
              <div className="print-card rounded-2xl border border-red-200 bg-red-50 p-4">
                <SectionHeader
                  icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                  title="Written Off / Not Collected"
                  subtitle="Closed as not paid. These amounts are excluded from received totals."
                />

                {writeOffs && writeOffs.total > 0 ? (
                  <>
                    <div className="space-y-2">
                      {writeOffs.rows.map((row) => (
                        <div
                          key={row.playerId}
                          className="rounded-xl border border-red-100 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-gray-950">
                                {row.playerName || row.playerId}
                              </p>
                              <p className="text-xs text-gray-600">{row.records} records</p>
                            </div>
                            <p className="text-base font-black text-red-700">
                              {formatCurrency(row.total)}
                            </p>
                          </div>

                          {row.adminNotes && (
                            <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-gray-700">
                              Note: {row.adminNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-red-600 p-3 text-white">
                      <p className="text-sm font-semibold">Total written off</p>
                      <p className="text-xl font-black">{formatCurrency(writeOffs.total)}</p>
                    </div>
                  </>
                ) : (
                  <EmptyState>No written-off payments.</EmptyState>
                )}
              </div>
            </div>

            {/* Audit explanation */}
            <div className="print-card rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <SectionHeader
                icon={<Scale className="h-5 w-5 text-gray-700" />}
                title="Audit Notes"
                subtitle="How to read this report."
              />

              <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                  <p className="font-bold text-gray-950">Approved total</p>
                  <p className="mt-1 text-xs leading-5">
                    The approved reconciliation total is the amount signed off during
                    reconciliation. It does not include late payments received after approval.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                  <p className="font-bold text-gray-950">Late payments</p>
                  <p className="mt-1 text-xs leading-5">
                    Late payments are confirmed after the event and shown separately so the
                    club can see the approved position and the final known collected position.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                  <p className="font-bold text-gray-950">Outstanding payments</p>
                  <p className="mt-1 text-xs leading-5">
                    Expected, claimed, and disputed amounts are not counted as received until
                    they are confirmed.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                  <p className="font-bold text-gray-950">Write-offs</p>
                  <p className="mt-1 text-xs leading-5">
                    Written-off payments are closed as not collected and are excluded from
                    received totals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 bg-white p-4">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>

          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}