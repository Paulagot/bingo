// src/components/Quiz/payments/reportExport.ts
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Minimal payload type carried from the UI */
type Payload = {
  config: any;
  players: any[];       // from usePlayerStore()
  allRoundsStats: any[]; // optional
};

// --- SHA-256 helpers (browser Web Crypto) ---
async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  if (!('crypto' in globalThis) || !crypto.subtle) return 'UNAVAILABLE';
  // Pass an ArrayBuffer slice to avoid BufferSource type complaints in some TS lib setups
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest('SHA-256', ab);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}


async function sha256HexFromText(text: string): Promise<string> {
  const enc = new TextEncoder();
  return sha256HexBytes(enc.encode(text));
}

async function sha256HexFromBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return sha256HexBytes(new Uint8Array(buf));
}


// ---------- small helpers ----------
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

const rowsToCsv = (rows: (string | number)[][]) =>
  rows.map(r => r.map(esc).join(',')).join('\n');

// Build a currency formatter string (no Intl for consistency in CSV)
const fmtCurrency = (symbol: string, amount: number) =>
  `${symbol}${(Number(amount) || 0).toFixed(2)}`;

// ---------- shared derivations ----------
function deriveCore(payload: Payload) {
  const { config, players } = payload;

  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0') || 0;

  const active = (players || []).filter((p) => !p.disqualified);
  const paid = active.filter((p) => p.paid);
  const unpaid = active.filter((p) => !p.paid);

  // Payment method aggregation (entry + extras)
  type MethodTotals = { entry: number; extrasAmount: number; extrasCount: number; total: number; };
  const methodMap: Record<string, MethodTotals> = {};

  const methodBump = (method: string) => {
    if (!methodMap[method]) {
      methodMap[method] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
    }
    return methodMap[method];
  };

  for (const p of active) {
    const primary = p.paymentMethod || 'unknown';
    if (p.paid) {
      methodBump(primary).entry += entryFee;
    }
    const extras = p.extraPayments || {};
    for (const key of Object.keys(extras)) {
      const ex = extras[key];
      const m = (ex?.method || 'unknown') as string;
      const amt = Number(ex?.amount || 0);
      methodBump(m).extrasAmount += amt;
      methodBump(m).extrasCount += 1;
    }
  }
  for (const k of Object.keys(methodMap)) {
    const m = methodMap[k];
    m.total = m.entry + m.extrasAmount;
  }

  const totalEntryReceived = paid.length * entryFee;
  const totalExtrasAmount = Object.values(methodMap).reduce((s, v) => s + v.extrasAmount, 0);
  const totalExtrasCount = Object.values(methodMap).reduce((s, v) => s + v.extrasCount, 0);
  const totalReceived = totalEntryReceived + totalExtrasAmount;

  // Ledger totals (fees, refunds, other adjustments)
  const ledger = (config?.reconciliation?.ledger || []) as any[];
  let fees = 0, refunds = 0, otherAdj = 0;
  for (const l of ledger) {
    const amt = Number(l.amount || 0);
    if (l.type === 'fee') fees += amt;
    else if (l.type === 'refund') refunds += amt;
    else if (l.type && l.type !== 'received') otherAdj += amt; // writeoff, correction, cash_over_short, prize_payout...
  }
  const netAdjustments = fees - refunds + otherAdj;

  // Final leaderboard: build from players store (fallback if no dedicated snapshot)
  // Sort by score desc; include optional fields if present.
  const leaderboard = [...active]
    .map((p) => ({
      id: p.id,
      name: p.name || '',
      score: Number(p.score || 0),
      cumulativeNegativePoints: Number(p.cumulativeNegativePoints || 0),
      pointsRestored: Number(p.pointsRestored || 0),
      tiebreakerBonus: Number(p.tiebreakerBonus || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({ rank: idx + 1, ...p }));

  // Prize register (from reconciliation.prizeAwards)
  type Award = {
    prizeAwardId: string;
    prizeId?: string | number;
    prizeName?: string;
    prizeValue?: number | null;
    sponsor?: string | null;
    place?: number;
    winnerPlayerId?: string;
    winnerName?: string;
    status?: string;
    declaredAt?: string;
    deliveredAt?: string;
    statusHistory?: Array<{ status: string; at: string; by?: string }>;
    awardMethod?: string;
    awardReference?: string;
    awardNotes?: string;
  };
  const awards: Award[] = ((config?.reconciliation as any)?.prizeAwards || []) as Award[];

  return {
    currency,
    entryFee,
    active,
    paid,
    unpaid,
    methodMap,
    totalEntryReceived,
    totalExtrasAmount,
    totalExtrasCount,
    totalReceived,
    ledger,
    fees,
    refunds,
    otherAdj,
    netAdjustments,
    leaderboard,
    awards,
  };
}

// ---------- CSV EXPORTS (consolidated) ----------
export async function exportCsvs(payload: Payload) {
  const {
    currency,
    entryFee,
    active,
    paid,
    unpaid,
    methodMap,
    totalEntryReceived,
    totalExtrasAmount,
    totalExtrasCount,
    totalReceived,
    ledger,
    fees,
    refunds,
    otherAdj,
    netAdjustments,
    leaderboard,
    awards,
  } = deriveCore(payload);

  const now = new Date().toLocaleString();

  // 1) payments_summary.csv (improved)
  const summaryRows: (string | number)[][] = [
    ['Payment Reconciliation'],
    ['Generated At', now],
    ['Approved By', payload.config?.reconciliation?.approvedBy || '—'],
    ['Approved At', payload.config?.reconciliation?.approvedAt || '—'],
    [],
    ['Entry Fee', fmtCurrency(currency, entryFee)],
    ['Total Players', active.length],
    ['Paid Players', paid.length],
    ['Unpaid Players', unpaid.length],
    ['Extras (count)', totalExtrasCount],
    ['Extras (amount)', fmtCurrency(currency, totalExtrasAmount)],
    ['Received Entry', fmtCurrency(currency, totalEntryReceived)],
    ['Grand Total', fmtCurrency(currency, totalReceived)],
    [],
    ['Payment Method Breakdown'],
    ['payment_method', 'entry_fees', 'extras_count', 'extras_amount', 'total', '%_of_total'],
  ];

  const methodKeys = Object.keys(methodMap);
  for (const m of methodKeys) {
    const d = methodMap[m];
    const pct = totalReceived > 0 ? ((d.total / totalReceived) * 100).toFixed(1) + '%' : '—';
    summaryRows.push([
      m,
      d.entry.toFixed(2),
      d.extrasCount,
      d.extrasAmount.toFixed(2),
      d.total.toFixed(2),
      pct,
    ]);
  }

  summaryRows.push(
    ['Total', totalEntryReceived.toFixed(2), totalExtrasCount, totalExtrasAmount.toFixed(2), totalReceived.toFixed(2), totalReceived > 0 ? '100%' : '—'],
    [],
    ['Adjustments (rollup)'],
    ['fees_total', fees.toFixed(2)],
    ['refunds_total', refunds.toFixed(2)],
    ['other_adjustments_total', otherAdj.toFixed(2)],
    ['net_adjustments', netAdjustments.toFixed(2)]
  );

  dl(new Blob([rowsToCsv(summaryRows)], { type: 'text/csv;charset=utf-8;' }), `payments_summary_${stamp()}.csv`);

  // 2) player_payments.csv (counts + totals, no extras JSON)
  const ppHeader = [
    'playerId',
    'name',
    'disqualified',
    'entry_paid_amount',
    'payment_method',
    'extras_count',
    'extras_amount',
    'total_paid',
  ];
  const ppBody = active.map((p) => {
    const extras = p.extraPayments || {};
    const extrasCount = Object.keys(extras).length;
    const extrasAmount = Object.values(extras).reduce((s: number, v: any) => s + Number(v?.amount || 0), 0);
    const entryPaid = p.paid ? entryFee : 0;
    const totalPaid = entryPaid + extrasAmount;

    return [
      p.id,
      p.name || '',
      p.disqualified ? 'yes' : 'no',
      entryPaid.toFixed(2),
      p.paymentMethod || '',
      extrasCount,
      extrasAmount.toFixed(2),
      totalPaid.toFixed(2),
    ];
  });

  dl(
    new Blob([rowsToCsv([ppHeader, ...ppBody])], { type: 'text/csv;charset=utf-8;' }),
    `player_payments_${stamp()}.csv`
  );

  // 3) ledger.csv (if present) — unchanged structure
  if (ledger.length) {
    const headerL = ['id','ts','type','method','payerId','amount','currency','reasonCode','note','createdBy'];
    const bodyL = ledger.map(l => [
      esc(l.id), esc(l.ts), esc(l.type), esc(l.method || ''), esc(l.payerId || ''),
      Number(l.amount || 0).toFixed(2), esc(l.currency || 'EUR'), esc(l.reasonCode || ''), esc(l.note || ''), esc(l.createdBy || ''),
    ]);
    dl(new Blob([rowsToCsv([headerL, ...bodyL])], { type: 'text/csv;charset=utf-8;' }), `ledger_${stamp()}.csv`);
  }

  // 4) prize_register.csv (with notes)
  if (awards.length) {
    const prHeader = [
      'prizeAwardId','place','prize_name','prize_value','sponsor',
      'winner_player_id','winner_name','status','method','reference','declared_at','delivered_at','notes'
    ];
    const prBody = awards.map((a) => [
      a.prizeAwardId,
      a.place ?? '',
      a.prizeName || '',
      (a.prizeValue ?? 0).toFixed(2),
      a.sponsor || '',
      a.winnerPlayerId || '',
      a.winnerName || '',
      a.status || 'declared',
      a.awardMethod || '',
      a.awardReference || '',
      a.declaredAt || '',
      a.deliveredAt || '',
      a.awardNotes || '',
    ]);
    dl(
      new Blob([rowsToCsv([prHeader, ...prBody])], { type: 'text/csv;charset=utf-8;' }),
      `prize_register_${stamp()}.csv`
    );
  }

  // 5) final_leaderboard.csv (added)
  if (leaderboard.length) {
    const lbHeader = [
      'rank','player_id','name','score','cumulative_negative_points','points_restored','tiebreaker_bonus'
    ];
    const lbBody = leaderboard.map((r) => [
      r.rank,
      r.id,
      r.name,
      r.score,
      r.cumulativeNegativePoints,
      r.pointsRestored,
      r.tiebreakerBonus,
    ]);
    dl(
      new Blob([rowsToCsv([lbHeader, ...lbBody])], { type: 'text/csv;charset=utf-8;' }),
      `final_leaderboard_${stamp()}.csv`
    );
  }
}

// ---------- PDF (improved reconciliation) ----------
export async function exportPdf(payload: Payload) {
  const {
    currency,
    entryFee,
    active,
    paid,
    unpaid,
    methodMap,
    totalEntryReceived,
    totalExtrasAmount,
    totalExtrasCount,
    totalReceived,
    fees,
    refunds,
    otherAdj,
    netAdjustments,
  } = deriveCore(payload);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text('Payment Reconciliation', 40, 40);
  doc.setFontSize(10);
  const lines = [
    `Room: ${payload.config?.roomId || '—'}`,
    `Generated At: ${new Date().toLocaleString()}`,
    `Approved By: ${payload.config?.reconciliation?.approvedBy || '—'}`,
    `Approved At: ${payload.config?.reconciliation?.approvedAt || '—'}`,
  ];
  lines.forEach((l, i) => doc.text(l, 40, 60 + 14 * i));

  autoTable(doc, {
    startY: 120,
    head: [['Metric','Value']],
    body: [
      ['Entry Fee', fmtCurrency(currency, entryFee)],
      ['Total Players', String(active.length)],
      ['Paid Players', String(paid.length)],
      ['Unpaid Players', String(unpaid.length)],
      ['Extras (count)', String(totalExtrasCount)],
      ['Extras (amount)', fmtCurrency(currency, totalExtrasAmount)],
      ['Received Entry', fmtCurrency(currency, totalEntryReceived)],
      ['Grand Total', fmtCurrency(currency, totalReceived)],
    ],
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: { fillColor: [240,240,240] },
  });

  // Method breakdown
  const startY1 = (doc as any).lastAutoTable.finalY + 20;
  autoTable(doc, {
    startY: startY1,
    head: [['Payment Method','Entry Fees','Extras (count)','Extras (amount)','Total','% of Total']],
    body: Object.keys(methodMap).map((m) => {
      const d = methodMap[m];
      const pct = totalReceived > 0 ? `${((d.total / totalReceived) * 100).toFixed(1)}%` : '—';
      return [
        m,
        d.entry.toFixed(2),
        String(d.extrasCount),
        d.extrasAmount.toFixed(2),
        d.total.toFixed(2),
        pct,
      ];
    }),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    foot: [[
      { content: 'Total', styles: { fontStyle: 'bold' } },
      { content: totalEntryReceived.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: String(totalExtrasCount), styles: { fontStyle: 'bold' } },
      { content: totalExtrasAmount.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalReceived.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalReceived > 0 ? '100%' : '—', styles: { fontStyle: 'bold' } },
    ]],
  });

  // Adjustments rollup
  const startY2 = (doc as any).lastAutoTable.finalY + 20;
  autoTable(doc, {
    startY: startY2,
    head: [['Adjustments','Amount']],
    body: [
      ['Fees total', fees.toFixed(2)],
      ['Refunds total', refunds.toFixed(2)],
      ['Other adjustments total', otherAdj.toFixed(2)],
      ['Net adjustments', netAdjustments.toFixed(2)],
    ],
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: { fillColor: [240,240,240] },
  });

  // Unpaid players
  const startY3 = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text('Unpaid Players:', 40, startY3);
  if (unpaid.length) {
    autoTable(doc, {
      startY: startY3 + 10,
      head: [['Name','ID']],
      body: unpaid.map((p) => [p.name || '—', p.id]),
      styles: { fontSize: 10 },
      theme: 'grid',
      margin: { left: 40, right: 40 },
      headStyles: { fillColor: [240,240,240] },
    });
  } else {
    doc.setFontSize(10);
    doc.text('All players are paid. ✅', 40, startY3 + 14);
  }

  doc.save(`payment_reconciliation_${stamp()}.pdf`);
}

// ---------- ZIP (includes CSVs, PDF, snapshot) ----------
export async function makeArchiveZip(payload: Payload) {
  const zip = new JSZip();

  const {
    currency,
    entryFee,
    active,
    paid,
    unpaid,
    methodMap,
    totalEntryReceived,
    totalExtrasAmount,
    totalExtrasCount,
    totalReceived,
    ledger,
    fees,
    refunds,
    otherAdj,
    netAdjustments,
    leaderboard,
    awards,
  } = deriveCore(payload);

  const nowIso = new Date().toISOString();
  const nameBase = `quiz_archive_${stamp()}`;
  const zipName = `${nameBase}.zip`;

  // README with verification instructions
  const readme = `Quiz Archive
Generated: ${nowIso}

Included files:
- payments_summary.csv           (summary + method breakdown + adjustments)
- player_payments.csv            (per-player totals; entry, extras, total)
- ledger.csv                     (adjustment entries, if any)
- prize_register.csv             (winner + prize status, method, reference, notes)
- final_leaderboard.csv          (final ranking snapshot)
- payment_reconciliation.pdf     (formatted PDF)
- reconciliation.json            (reconciliation object & minimal config snapshot)
- MANIFEST.json                  (SHA-256 checksums for all files above)

Integrity / Verification
------------------------
A detached SHA-256 is downloaded alongside the ZIP:

  ${nameBase}.sha256

Verify the ZIP on macOS/Linux:
  shasum -a 256 ${zipName}

On Windows (PowerShell):
  Get-FileHash ${zipName} -Algorithm SHA256

Compare the output to the contents of ${nameBase}.sha256.
You can also verify individual files inside the ZIP using MANIFEST.json.
`;

  // Build all file contents first so we can hash them before adding to zip
  const files: Array<{
    name: string;
    type: 'text' | 'blob';
    // exactly one of:
    text?: string;
    blob?: Blob;
    // filled during hashing:
    size?: number;
    sha256?: string;
  }> = [];

  // reconciliation.json snapshot
  files.push({
    name: 'reconciliation.json',
    type: 'text',
    text: JSON.stringify(
      {
        roomId: payload.config?.roomId,
        reconciliation: payload.config?.reconciliation || {},
        currency: payload.config?.currencySymbol || '€',
        entryFee: payload.config?.entryFee,
        generatedAt: nowIso,
      },
      null,
      2
    ),
  });

  // README
  files.push({ name: 'README.txt', type: 'text', text: readme });

  // payments_summary.csv
  const summaryHeaderRows: (string | number)[][] = [
    ['Payment Reconciliation'],
    ['Generated At', new Date().toLocaleString()],
    ['Approved By', payload.config?.reconciliation?.approvedBy || '—'],
    ['Approved At', payload.config?.reconciliation?.approvedAt || '—'],
    [],
    ['Entry Fee', fmtCurrency(currency, entryFee)],
    ['Total Players', active.length],
    ['Paid Players', paid.length],
    ['Unpaid Players', unpaid.length],
    ['Extras (count)', totalExtrasCount],
    ['Extras (amount)', fmtCurrency(currency, totalExtrasAmount)],
    ['Received Entry', fmtCurrency(currency, totalEntryReceived)],
    ['Grand Total', fmtCurrency(currency, totalReceived)],
    [],
    ['Payment Method Breakdown'],
    ['payment_method','entry_fees','extras_count','extras_amount','total','%_of_total'],
  ];
  const methodRows = Object.keys(methodMap).map((m) => {
    const d = methodMap[m];
    const pct = totalReceived > 0 ? ((d.total / totalReceived) * 100).toFixed(1) + '%' : '—';
    return [m, d.entry.toFixed(2), d.extrasCount, d.extrasAmount.toFixed(2), d.total.toFixed(2), pct];
  });
  const adjustmentRows: (string | number)[][] = [
    [],
    ['Adjustments (rollup)'],
    ['fees_total', fees.toFixed(2)],
    ['refunds_total', refunds.toFixed(2)],
    ['other_adjustments_total', otherAdj.toFixed(2)],
    ['net_adjustments', netAdjustments.toFixed(2)],
  ];
  files.push({
    name: 'payments_summary.csv',
    type: 'text',
    text: rowsToCsv([...summaryHeaderRows, ...methodRows, ...adjustmentRows]),
  });

  // player_payments.csv
  const ppHeader = [
    'playerId','name','disqualified','entry_paid_amount','payment_method','extras_count','extras_amount','total_paid'
  ];
  const ppBody = active.map((p) => {
    const extras = p.extraPayments || {};
    const extrasCount = Object.keys(extras).length;
    const extrasAmount = Object.values(extras).reduce((s: number, v: any) => s + Number(v?.amount || 0), 0);
    const entryPaid = p.paid ? entryFee : 0;
    const totalPaid = entryPaid + extrasAmount;
    return [
      p.id,
      p.name || '',
      p.disqualified ? 'yes' : 'no',
      entryPaid.toFixed(2),
      p.paymentMethod || '',
      extrasCount,
      extrasAmount.toFixed(2),
      totalPaid.toFixed(2),
    ];
  });
  files.push({ name: 'player_payments.csv', type: 'text', text: rowsToCsv([ppHeader, ...ppBody]) });

  // ledger.csv
  if (ledger.length) {
    const headerL = ['id','ts','type','method','payerId','amount','currency','reasonCode','note','createdBy'];
    const bodyL = ledger.map(l => [
      esc(l.id), esc(l.ts), esc(l.type), esc(l.method || ''), esc(l.payerId || ''),
      Number(l.amount || 0).toFixed(2), esc(l.currency || 'EUR'), esc(l.reasonCode || ''), esc(l.note || ''), esc(l.createdBy || ''),
    ]);
    files.push({ name: 'ledger.csv', type: 'text', text: rowsToCsv([headerL, ...bodyL]) });
  }

  // prize_register.csv
  if (awards.length) {
    const prHeader = [
      'prizeAwardId','place','prize_name','prize_value','sponsor',
      'winner_player_id','winner_name','status','method','reference','declared_at','delivered_at','notes'
    ];
    const prBody = awards.map((a) => [
      a.prizeAwardId,
      a.place ?? '',
      a.prizeName || '',
      (a.prizeValue ?? 0).toFixed(2),
      a.sponsor || '',
      a.winnerPlayerId || '',
      a.winnerName || '',
      a.status || 'declared',
      a.awardMethod || '',
      a.awardReference || '',
      a.declaredAt || '',
      a.deliveredAt || '',
      a.awardNotes || '',
    ]);
    files.push({ name: 'prize_register.csv', type: 'text', text: rowsToCsv([prHeader, ...prBody]) });
  }

  // final_leaderboard.csv
  if (leaderboard.length) {
    const lbHeader = [
      'rank','player_id','name','score','cumulative_negative_points','points_restored','tiebreaker_bonus'
    ];
    const lbBody = leaderboard.map((r) => [
      r.rank, r.id, r.name, r.score, r.cumulativeNegativePoints, r.pointsRestored, r.tiebreakerBonus,
    ]);
    files.push({ name: 'final_leaderboard.csv', type: 'text', text: rowsToCsv([lbHeader, ...lbBody]) });
  }

  // PDF
  const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4' });
  // (same content as exportPdf)
  pdfDoc.setFontSize(16);
  pdfDoc.text('Payment Reconciliation', 40, 40);
  pdfDoc.setFontSize(10);
  const lines = [
    `Room: ${payload.config?.roomId || '—'}`,
    `Generated At: ${new Date().toLocaleString()}`,
    `Approved By: ${payload.config?.reconciliation?.approvedBy || '—'}`,
    `Approved At: ${payload.config?.reconciliation?.approvedAt || '—'}`,
  ];
  lines.forEach((l, i) => pdfDoc.text(l, 40, 60 + 14 * i));

  autoTable(pdfDoc, {
    startY: 120,
    head: [['Metric','Value']],
    body: [
      ['Entry Fee', fmtCurrency(currency, entryFee)],
      ['Total Players', String(active.length)],
      ['Paid Players', String(paid.length)],
      ['Unpaid Players', String(unpaid.length)],
      ['Extras (count)', String(totalExtrasCount)],
      ['Extras (amount)', fmtCurrency(currency, totalExtrasAmount)],
      ['Received Entry', fmtCurrency(currency, totalEntryReceived)],
      ['Grand Total', fmtCurrency(currency, totalReceived)],
    ],
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: { fillColor: [240,240,240] },
  });

  const startY1 = (pdfDoc as any).lastAutoTable.finalY + 20;
  autoTable(pdfDoc, {
    startY: startY1,
    head: [['Payment Method','Entry Fees','Extras (count)','Extras (amount)','Total','% of Total']],
    body: Object.keys(methodMap).map((m) => {
      const d = methodMap[m];
      const pct = totalReceived > 0 ? `${((d.total / totalReceived) * 100).toFixed(1)}%` : '—';
      return [m, d.entry.toFixed(2), String(d.extrasCount), d.extrasAmount.toFixed(2), d.total.toFixed(2), pct];
    }),
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    foot: [[
      { content: 'Total', styles: { fontStyle: 'bold' } },
      { content: totalEntryReceived.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: String(totalExtrasCount), styles: { fontStyle: 'bold' } },
      { content: totalExtrasAmount.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalReceived.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalReceived > 0 ? '100%' : '—', styles: { fontStyle: 'bold' } },
    ]],
  });

  const startY2 = (pdfDoc as any).lastAutoTable.finalY + 20;
  autoTable(pdfDoc, {
    startY: startY2,
    head: [['Adjustments','Amount']],
    body: [
      ['Fees total', fees.toFixed(2)],
      ['Refunds total', refunds.toFixed(2)],
      ['Other adjustments total', otherAdj.toFixed(2)],
      ['Net adjustments', netAdjustments.toFixed(2)],
    ],
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: { fillColor: [240,240,240] },
  });

  const startY3 = (pdfDoc as any).lastAutoTable.finalY + 20;
  pdfDoc.setFontSize(12);
  pdfDoc.text('Unpaid Players:', 40, startY3);
  if (unpaid.length) {
    autoTable(pdfDoc, {
      startY: startY3 + 10,
      head: [['Name','ID']],
      body: unpaid.map((p) => [p.name || '—', p.id]),
      styles: { fontSize: 10 },
      theme: 'grid',
      margin: { left: 40, right: 40 },
      headStyles: { fillColor: [240,240,240] },
    });
  } else {
    pdfDoc.setFontSize(10);
    pdfDoc.text('All players are paid. ✅', 40, startY3 + 14);
  }

  const pdfArrayBuffer = pdfDoc.output('arraybuffer');
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  files.push({ name: 'payment_reconciliation.pdf', type: 'blob', blob: pdfBlob });

  // ---- Compute per-file SHA-256 & add them into the zip ----
  const manifest: {
    algorithm: 'SHA-256';
    createdAt: string;
    files: Array<{ name: string; size: number; sha256: string }>;
  } = { algorithm: 'SHA-256', createdAt: nowIso, files: [] };

  for (const f of files) {
    if (f.type === 'text') {
      const hex = await sha256HexFromText(f.text || '');
      const size = new TextEncoder().encode(f.text || '').length;
      f.sha256 = hex;
      f.size = size;
      zip.file(f.name, f.text || '');
      manifest.files.push({ name: f.name, size, sha256: hex });
    } else {
      const hex = await sha256HexFromBlob(f.blob!);
      const size = f.blob ? f.blob.size : 0;
      f.sha256 = hex;
      f.size = size;
      zip.file(f.name, f.blob!);
      manifest.files.push({ name: f.name, size, sha256: hex });
    }
  }

  // Add MANIFEST.json last (itself also hashed)
  const manifestText = JSON.stringify(manifest, null, 2);

  zip.file('MANIFEST.json', manifestText);

  // Generate ZIP
  const blob = await zip.generateAsync({ type: 'blob' });

  // Compute ZIP SHA-256 and download .sha256 alongside the ZIP
  const zipSha = await sha256HexFromBlob(blob);
  dl(blob, zipName);
  dl(new Blob([`${zipSha}  ${zipName}\n`], { type: 'text/plain;charset=utf-8;' }), `${nameBase}.sha256`);
}



