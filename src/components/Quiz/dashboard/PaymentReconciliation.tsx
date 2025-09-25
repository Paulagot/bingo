import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';

type MethodTotals = { entry: number; extrasAmount: number; extrasCount: number; total: number };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="text-xs text-fg/70">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function escapeCsv(value: string) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

const PaymentReconciliationPanel: React.FC = () => {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0');

  // Reconciliation fields
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Seed from config if present
  useEffect(() => {
    const rec = config?.reconciliation as any;
    if (rec) {
      setApprovedBy(rec.approvedBy || '');
      setNotes(rec.notes || '');
      setApprovedAt(rec.approvedAt || null);
    }
  }, [config?.reconciliation]);

  // Ask server for current state when this tab opens
  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit('request_reconciliation', { roomId });
  }, [socket, roomId]);

  // Apply incoming updates from other hosts
  useEffect(() => {
    if (!socket || !roomId) return;

    const applyUpdate = ({ roomId: rid, data }: { roomId: string; data: any }) => {
      if (rid !== roomId) return;
      setApprovedBy(data?.approvedBy || '');
      setNotes(data?.notes || '');
      setApprovedAt(data?.approvedAt || null);
      // also mirror into config so any other panels reading config see it
      const curr = useQuizConfig.getState().config || {};
      useQuizConfig.getState().setFullConfig({ ...(curr as any), reconciliation: data } as any);
    };

    socket.on('reconciliation_updated', applyUpdate);
    socket.on('reconciliation_state', applyUpdate);

    return () => {
      socket.off('reconciliation_updated', applyUpdate);
      socket.off('reconciliation_state', applyUpdate);
    };
  }, [socket, roomId]);

  // Debounced save to server (into room.config.reconciliation)
  const queueSave = (patch: any) => {
    if (!socket || !roomId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      socket.emit('update_reconciliation', { roomId, patch });
    }, 350);
  };

  const onApprovedByChange = (v: string) => {
    setApprovedBy(v);
    queueSave({ approvedBy: v });
  };
  const onNotesChange = (v: string) => {
    setNotes(v);
    queueSave({ notes: v });
  };
  const onMarkApproved = () => {
    const t = new Date().toISOString();
    setApprovedAt(t);
    queueSave({ approvedAt: t });
  };

  // ----- totals & breakdown -----
  const paymentData: Record<string, MethodTotals> = {};
  const activePlayers = players.filter((p) => !p.disqualified);
  const paidPlayers = activePlayers.filter((p) => p.paid);
  const unpaidPlayers = activePlayers.filter((p) => !p.paid);

  for (const p of activePlayers) {
    const primaryMethod = p.paymentMethod || 'unknown';
    if (!paymentData[primaryMethod]) {
      paymentData[primaryMethod] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
    }
    if (p.paid) paymentData[primaryMethod].entry += entryFee;

    if (p.extraPayments) {
      for (const [, val] of Object.entries(p.extraPayments)) {
        const m = (val as any)?.method || 'unknown';
        const amt = Number((val as any)?.amount || 0);
        if (!paymentData[m]) paymentData[m] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
        paymentData[m].extrasAmount += amt;
        paymentData[m].extrasCount += 1;
      }
    }
  }
  for (const k in paymentData) {
    const d = paymentData[k];
    d.total = d.entry + d.extrasAmount;
  }

  const totalPlayers = activePlayers.length;
  const totalEntryReceived = paidPlayers.length * entryFee;
  const totalExtrasAmount = Object.values(paymentData).reduce((s, v) => s + v.extrasAmount, 0);
  const totalExtrasCount = Object.values(paymentData).reduce((s, v) => s + v.extrasCount, 0);
  const totalReceived = totalEntryReceived + totalExtrasAmount;
  const fmt = (n: number) => `${currency}${n.toFixed(2)}`;

  // ----- Export CSV + (optional) PDF -----
  const exportCsvAndPdf = async () => {
    const now = new Date();
    const iso = now.toISOString();
    const stamp = iso.replace(/[:\-]/g, '').replace('.000Z', '').slice(0, 15);
    const reportTitle = 'Payment Reconciliation';
    const fileBase = `payment-reconciliation-${stamp}`;

    // CSV header/meta
    const headerLines = [
      reportTitle,
      `Generated At,${now.toLocaleString()}`,
      `Approved By,${escapeCsv(approvedBy)}`,
      `Comments/Notes,${escapeCsv(notes)}`,
      `Approved At,${approvedAt || '—'}`,
      '',
    ];

    // CSV summary (flat)
    const summaryFlat = [
      ['Entry Fee', fmt(entryFee)],
      ['Total Players', String(totalPlayers)],
      ['Paid Players', String(paidPlayers.length)],
      ['Unpaid Players', String(unpaidPlayers.length)],
      ['Extras (count)', String(totalExtrasCount)],
      ['Extras (amount)', fmt(totalExtrasAmount)],
      ['Received Entry', fmt(totalEntryReceived)],
      ['Grand Total', fmt(totalReceived)],
    ].map((r) => r.map(escapeCsv).join(','));

    // CSV table
    const tableHeader = [
      'Payment Method',
      'Entry Fees',
      'Extras (count)',
      'Extras (amount)',
      'Total',
      '% of Total',
    ];
    const tableRows = Object.entries(paymentData).map(([method, d]) => [
      method,
      d.entry.toFixed(2),
      String(d.extrasCount),
      d.extrasAmount.toFixed(2),
      d.total.toFixed(2),
      totalReceived > 0 ? ((d.total / totalReceived) * 100).toFixed(1) + '%' : '—',
    ]);
    const totalsRow = [
      'Total',
      totalEntryReceived.toFixed(2),
      String(totalExtrasCount),
      totalExtrasAmount.toFixed(2),
      totalReceived.toFixed(2),
      totalReceived > 0 ? '100%' : '—',
    ];

    const csvContent = [
      ...headerLines,
      ...summaryFlat,
      '',
      tableHeader.join(','),
      ...tableRows.map((r) => r.map(escapeCsv).join(',')),
      totalsRow.map(escapeCsv).join(','),
      '',
      'Unpaid Players',
      ...(unpaidPlayers.length ? unpaidPlayers.map((p) => escapeCsv(p.name || p.id)) : ['All players are paid.']),
    ].join('\n');

    downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${fileBase}.csv`);

    // Try PDF; if libs missing, just skip (CSV is already saved)
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

      doc.setFontSize(16);
      doc.text(reportTitle, 40, 40);
      doc.setFontSize(10);
      [
        `Generated At: ${now.toLocaleString()}`,
        `Approved By: ${approvedBy || '—'}`,
        `Approved At: ${approvedAt || '—'}`,
        `Comments/Notes: ${notes || '—'}`,
      ].forEach((line, i) => doc.text(line, 40, 60 + i * 14));

      // Summary grid
      autoTable(doc, {
        startY: 110,
        head: [['Metric', 'Value']],
        body: [
          ['Entry Fee', fmt(entryFee)],
          ['Total Players', String(totalPlayers)],
          ['Paid Players', String(paidPlayers.length)],
          ['Unpaid Players', String(unpaidPlayers.length)],
          ['Extras (count)', String(totalExtrasCount)],
          ['Extras (amount)', fmt(totalExtrasAmount)],
          ['Received Entry', fmt(totalEntryReceived)],
          ['Grand Total', fmt(totalReceived)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
        theme: 'grid',
        margin: { left: 40, right: 40 },
      });

      // Method breakdown (+ totals foot)
      const bodyRows = Object.entries(paymentData).map(([method, d]) => [
        method,
        fmt(d.entry),
        String(d.extrasCount),
        fmt(d.extrasAmount),
        fmt(d.total),
        totalReceived > 0 ? `${((d.total / totalReceived) * 100).toFixed(1)}%` : '—',
      ]);

      autoTable(doc, {
        head: [['Payment Method', 'Entry Fees', 'Extras (count)', 'Extras (amount)', 'Total', '% of Total']],
        body: bodyRows,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
        theme: 'grid',
        margin: { left: 40, right: 40 },
        startY: (doc as any).lastAutoTable.finalY + 20,
        foot: [[
          { content: 'Total', styles: { fontStyle: 'bold' } },
          { content: fmt(totalEntryReceived), styles: { fontStyle: 'bold' } },
          { content: String(totalExtrasCount), styles: { fontStyle: 'bold' } },
          { content: fmt(totalExtrasAmount), styles: { fontStyle: 'bold' } },
          { content: fmt(totalReceived), styles: { fontStyle: 'bold' } },
          { content: totalReceived > 0 ? '100%' : '—', styles: { fontStyle: 'bold' } },
        ]],
      });

      // Unpaid list
      const afterY = (doc as any).lastAutoTable?.finalY || 140;
      doc.setFontSize(12);
      doc.text('Unpaid Players (Entry):', 40, afterY + 24);
      doc.setFontSize(10);
      if (unpaidPlayers.length === 0) {
        doc.text('All players are paid. ✅', 40, afterY + 40);
      } else {
        const names = unpaidPlayers.map((p) => p.name || p.id).join(', ');
        const lines = (doc as any).splitTextToSize(names, 515);
        doc.text(lines, 40, afterY + 40);
      }

      doc.save(`${fileBase}.pdf`);
    } catch (err) {
      console.warn('PDF export skipped (jspdf/jspdf-autotable not available).', err);
    }
  };

  return (
    <div className="bg-muted rounded-xl p-8 shadow-md">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-fg text-2xl font-bold">💰 Payment Reconciliation</h2>
        <button
          onClick={exportCsvAndPdf}
          className="rounded-xl bg-black px-4 py-2 text-white shadow hover:opacity-90"
        >
          Export CSV + PDF
        </button>
      </div>

      {/* Reconciliation fields */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-fg/80">Approved by</label>
          <input
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            value={approvedBy}
            onChange={(e) => onApprovedByChange(e.target.value)}
            placeholder="Name / Role"
          />
          <button onClick={onMarkApproved} className="mt-2 rounded-lg border px-3 py-1 text-xs">
            Mark Approved
          </button>
          {approvedAt && (
            <p className="mt-1 text-xs text-fg/60">Approved at: {new Date(approvedAt).toLocaleString()}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-fg/80">Comments / Notes</label>
          <textarea
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Any reconciliation notes, discrepancies, or approvals…"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
        <Stat label="Total Players" value={String(totalPlayers)} />
        <Stat label="Paid" value={String(paidPlayers.length)} />
        <Stat label="Unpaid" value={String(unpaidPlayers.length)} />
        <Stat label="Entry Fee" value={fmt(entryFee)} />
        <Stat label="Extras (count)" value={String(totalExtrasCount)} />
        <Stat label="Extras (amount)" value={fmt(totalExtrasAmount)} />
      </div>

      {/* Breakdown by Payment Method */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Breakdown by Payment Method</h3>
        <div className="overflow-auto">
          <table className="min-w-full border text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Payment Method</th>
                <th className="border px-3 py-2">Entry Fees</th>
                <th className="border px-3 py-2">Extras (count)</th>
                <th className="border px-3 py-2">Extras (amount)</th>
                <th className="border px-3 py-2">Total</th>
                <th className="border px-3 py-2">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paymentData).map(([method, d]) => (
                <tr key={method}>
                  <td className="border px-3 py-2 capitalize">{method}</td>
                  <td className="border px-3 py-2">{fmt(d.entry)}</td>
                  <td className="border px-3 py-2">{d.extrasCount}</td>
                  <td className="border px-3 py-2">{fmt(d.extrasAmount)}</td>
                  <td className="border px-3 py-2 font-medium">{fmt(d.total)}</td>
                  <td className="border px-3 py-2">
                    {totalReceived > 0 ? `${((d.total / totalReceived) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 font-semibold">
                <td className="border px-3 py-2">Total</td>
                <td className="border px-3 py-2">{fmt(totalEntryReceived)}</td>
                <td className="border px-3 py-2">{totalExtrasCount}</td>
                <td className="border px-3 py-2">{fmt(totalExtrasAmount)}</td>
                <td className="border px-3 py-2">{fmt(totalReceived)}</td>
                <td className="border px-3 py-2">{totalReceived > 0 ? '100%' : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Unpaid Players */}
      <div>
        <h3 className="text-lg font-semibold mb-2">🚩 Unpaid Players (Entry)</h3>
        {unpaidPlayers.length === 0 ? (
          <p className="text-green-700">All players are paid. Ready to go! ✅</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1 text-red-600">
            {unpaidPlayers.map((p) => (
              <li key={p.id}>{p.name || p.id}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PaymentReconciliationPanel;








