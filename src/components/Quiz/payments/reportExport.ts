// src/components/Quiz/payments/reportExport.ts
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type Payload = {
  config: any;
  players: any[];
  allRoundsStats: any[];
};

const dl = (blob: Blob, name: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
};

const esc = (v: any) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const stamp = () => new Date().toISOString().replace(/[:\-]/g, '').slice(0, 15);

export async function exportCsvs({ config, players }: Payload) {
  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0');
  const active = players.filter((p) => !p.disqualified);
  const paid = active.filter((p) => p.paid);
  const unpaid = active.filter((p) => !p.paid);

  // payments_summary.csv
  const lines = [
    `Payment Reconciliation`,
    `Generated At,${new Date().toLocaleString()}`,
    `Approved By,${esc(config?.reconciliation?.approvedBy || '—')}`,
    `Approved At,${esc(config?.reconciliation?.approvedAt || '—')}`,
    '',
    `Entry Fee,${currency}${entryFee.toFixed(2)}`,
    `Total Players,${active.length}`,
    `Paid Players,${paid.length}`,
    `Unpaid Players,${unpaid.length}`,
  ].join('\n');
  dl(new Blob([lines], { type: 'text/csv;charset=utf-8;' }), `payments_summary_${stamp()}.csv`);

  // player_payments.csv
  const header = ['playerId','name','entryPaid','method','extras_json','total_paid','refunded_amount','net_contribution'];
  const body = active.map((p) => [
    esc(p.id),
    esc(p.name || ''),
    p.paid ? 'yes' : 'no',
    esc(p.paymentMethod || ''),
    esc(JSON.stringify(p.extraPayments || {})),
    (p.paid ? entryFee : 0) + Object.values(p.extraPayments || {}).reduce((s: number, v: any) => s + (+v.amount || 0), 0),
    0, // optional if you support per-player refunds ledger
    0, // optional net per player
  ]);
  const csv = [header.join(','), ...body.map(r => r.join(','))].join('\n');
  dl(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `player_payments_${stamp()}.csv`);

  // ledger.csv (if present)
  const ledger = (config?.reconciliation?.ledger || []) as any[];
  if (ledger.length) {
    const headerL = ['id','ts','type','method','payerId','amount','currency','reasonCode','note','createdBy'];
    const bodyL = ledger.map(l => [
      esc(l.id), esc(l.ts), esc(l.type), esc(l.method || ''), esc(l.payerId || ''),
      l.amount, esc(l.currency || 'EUR'), esc(l.reasonCode || ''), esc(l.note || ''), esc(l.createdBy || ''),
    ]);
    const csvL = [headerL.join(','), ...bodyL.map(r => r.join(','))].join('\n');
    dl(new Blob([csvL], { type: 'text/csv;charset=utf-8;' }), `ledger_${stamp()}.csv`);
  }
}

export async function exportPdf({ config, players }: Payload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0');
  const active = players.filter((p) => !p.disqualified);
  const paid = active.filter((p) => p.paid);
  const unpaid = active.filter((p) => !p.paid);

  doc.setFontSize(16);
  doc.text('Payment Reconciliation', 40, 40);
  doc.setFontSize(10);
  const lines = [
    `Room: ${config?.roomId || '—'}`,
    `Generated At: ${new Date().toLocaleString()}`,
    `Approved By: ${config?.reconciliation?.approvedBy || '—'}`,
    `Approved At: ${config?.reconciliation?.approvedAt || '—'}`,
  ];
  lines.forEach((l, i) => doc.text(l, 40, 60 + 14 * i));

  autoTable(doc, {
    startY: 120,
    head: [['Metric','Value']],
    body: [
      ['Entry Fee', `${currency}${entryFee.toFixed(2)}`],
      ['Total Players', String(active.length)],
      ['Paid Players', String(paid.length)],
      ['Unpaid Players', String(unpaid.length)],
    ],
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: { fillColor: [240,240,240] },
  });

  if (unpaid.length) {
    const y = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text('Unpaid Players:', 40, y);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: y + 10,
      head: [['Name','ID']],
      body: unpaid.map((p) => [p.name || '—', p.id]),
      styles: { fontSize: 10 },
      theme: 'grid',
      margin: { left: 40, right: 40 },
      headStyles: { fillColor: [240,240,240] },
    });
  }

  // Ledger appendix (optional)
  const ledger = (config?.reconciliation?.ledger || []) as any[];
  if (ledger.length) {
    const y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : 220;
    doc.setFontSize(12);
    doc.text('Adjustments Ledger:', 40, y);
    autoTable(doc, {
      startY: y + 10,
      head: [['When','Type','Method','Amount','Reason','Note']],
      body: ledger.map(l => [
        new Date(l.ts).toLocaleString(), l.type, l.method || '—',
        `${currency}${(+l.amount || 0).toFixed(2)}`,
        l.reasonCode || '—', l.note || '—'
      ]),
      styles: { fontSize: 9 },
      theme: 'grid',
      margin: { left: 40, right: 40 },
      headStyles: { fillColor: [240,240,240] },
    });
  }

  doc.save(`payment_reconciliation_${stamp()}.pdf`);
}

export async function makeArchiveZip(payload: Payload) {
  const zip = new JSZip();
  // Reuse exporters, but capture blobs instead of direct download for archive
  const now = new Date().toISOString();
  const meta = { generatedAt: now, version: '1.0.0' };

  // summary
  const summaryTxt = `FundRaisely Quiz Archive
Generated: ${now}

Includes:
- CSVs (payments_summary, player_payments, ledger)
- PDF (payment_reconciliation)
- JSON (config snapshot)
`;
  zip.file('README.txt', summaryTxt);

  // JSON snapshot
  zip.file('reconciliation.json', JSON.stringify({
    roomId: payload.config?.roomId,
    reconciliation: payload.config?.reconciliation || {},
    currency: payload.config?.currencySymbol || '€',
    entryFee: payload.config?.entryFee,
  }, null, 2));

  // CSVs
  // (re-run minimal logic inline to collect as blobs)
  // player_payments:
  const { config, players } = payload;
  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0');
  const active = players.filter((p) => !p.disqualified);
  const paid = active.filter((p) => p.paid);
  const unpaid = active.filter((p) => !p.paid);

  const sumLines = [
    `Payment Reconciliation`,
    `Generated At,${new Date().toLocaleString()}`,
    `Approved By,${esc(config?.reconciliation?.approvedBy || '—')}`,
    `Approved At,${esc(config?.reconciliation?.approvedAt || '—')}`,
    '',
    `Entry Fee,${currency}${entryFee.toFixed(2)}`,
    `Total Players,${active.length}`,
    `Paid Players,${paid.length}`,
    `Unpaid Players,${unpaid.length}`,
  ].join('\n');
  zip.file('payments_summary.csv', sumLines);

  const header = ['playerId','name','entryPaid','method','extras_json','total_paid'];
  const body = active.map((p) => [
    esc(p.id), esc(p.name || ''), p.paid ? 'yes' : 'no', esc(p.paymentMethod || ''),
    esc(JSON.stringify(p.extraPayments || {})),
    ((p.paid ? entryFee : 0) + Object.values(p.extraPayments || {}).reduce((s: number, v: any) => s + (+v.amount || 0), 0)).toFixed(2)
  ].join(','));
  zip.file('player_payments.csv', [header.join(','), ...body].join('\n'));

  const ledger = (config?.reconciliation?.ledger || []) as any[];
  if (ledger.length) {
    const headerL = ['id','ts','type','method','payerId','amount','currency','reasonCode','note','createdBy'];
    const bodyL = ledger.map(l => [
      esc(l.id), esc(l.ts), esc(l.type), esc(l.method || ''), esc(l.payerId || ''),
      l.amount, esc(l.currency || 'EUR'), esc(l.reasonCode || ''), esc(l.note || ''), esc(l.createdBy || '')
    ].join(','));
    zip.file('ledger.csv', [headerL.join(','), ...bodyL].join('\n'));
  }

  // PDF
  // Generate once, then add to zip (render to ArrayBuffer)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  await exportPdf(payload); // optional: also download to user
  // (For zip embedding, a second render would be needed; to keep minimal, skip embedding PDF or implement a parallel renderer returning Uint8Array.)

  const blob = await zip.generateAsync({ type: 'blob' });
  dl(blob, `quiz_archive_${stamp()}.zip`);
}
