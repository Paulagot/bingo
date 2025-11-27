import JSZip from "jszip";
import { buildPaymentReconciliationPdf } from "../reports/buildReconciliationPdf";
import { deriveCore } from "../reports/deriveCore";

/** Minimal payload type carried from the UI */
type Payload = {
  config: any;
  players: any[];
  allRoundsStats?: any[];
};

/* =======================================================================
   SHA-256 HELPERS (WebCrypto-safe)
   ======================================================================= */

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  // SAFEST: copy to guarantee pure ArrayBuffer (never SharedArrayBuffer)
  const arrayBuffer = bytes.slice().buffer;

  const hash = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256HexFromText(text: string): Promise<string> {
  return sha256HexBytes(new TextEncoder().encode(text));
}

async function sha256HexFromBlob(blob: Blob): Promise<string> {
  const ab = await blob.arrayBuffer();
  return sha256HexBytes(new Uint8Array(ab));
}

/* =======================================================================
   SMALL HELPERS
   ======================================================================= */

const dl = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
};

const esc = (v: any) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const stamp = () =>
  new Date().toISOString().replace(/[:\-]/g, "").slice(0, 15);

const rowsToCsv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map(esc).join(",")).join("\n");

const fmtCurrency = (symbol: string, amount: number) =>
  `${symbol}${(Number(amount) || 0).toFixed(2)}`;

/* =======================================================================
   CSV EXPORTS (unchanged externally)
   ======================================================================= */

export async function exportCsvs(payload: Payload) {
  const core = deriveCore(payload);

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
    prizesByStatus,
    totalPrizeValue,
    deliveredCount,
    deliveredValue,
    unclaimedCount,
    unclaimedValue,
  } = core;

  const now = new Date().toLocaleString();

  /* ----------------------------------------------------------
     payments_summary.csv
     ---------------------------------------------------------- */
  const summaryRows: (string | number)[][] = [
    ["Payment Reconciliation"],
    ["Generated At", now],
    ["Approved By", payload.config?.reconciliation?.approvedBy || "—"],
    ["Approved At", payload.config?.reconciliation?.approvedAt || "—"],
    [],
    ["Entry Fee", fmtCurrency(currency, entryFee)],
    ["Total Players", active.length],
    ["Paid Players", paid.length],
    ["Unpaid Players", unpaid.length],
    ["Extras (count)", totalExtrasCount],
    ["Extras (amount)", fmtCurrency(currency, totalExtrasAmount)],
    ["Received Entry", fmtCurrency(currency, totalEntryReceived)],
    ["Grand Total", fmtCurrency(currency, totalReceived)],
    [],
    ["Payment Method Breakdown"],
    ["payment_method", "entry_fees", "extras_count", "extras_amount", "total", "%_of_total"],
  ];

  for (const m of Object.keys(methodMap)) {
    const d = methodMap[m];
    if (!d) continue;

    const pct =
      totalReceived > 0
        ? ((d.total / totalReceived) * 100).toFixed(1) + "%"
        : "—";

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
    [
      "Total",
      totalEntryReceived.toFixed(2),
      totalExtrasCount,
      totalExtrasAmount.toFixed(2),
      totalReceived.toFixed(2),
      totalReceived > 0 ? "100%" : "—",
    ],
    [],
    ["Adjustments (rollup)"],
    ["fees_total", fees.toFixed(2)],
    ["refunds_total", refunds.toFixed(2)],
    ["other_adjustments_total", otherAdj.toFixed(2)],
    ["net_adjustments", netAdjustments.toFixed(2)],
    [],
    ["Prize Distribution Summary"],
    ["total_prizes", awards.length],
    ["total_prize_value", fmtCurrency(currency, totalPrizeValue)],
    ["delivered_collected_count", deliveredCount],
    ["delivered_collected_value", fmtCurrency(currency, deliveredValue)],
    ["unclaimed_refused_count", unclaimedCount],
    ["unclaimed_refused_value", fmtCurrency(currency, unclaimedValue)],
    [],
    ["Prize Status Breakdown"],
    ["status", "count", "total_value"]
  );

  Object.entries(prizesByStatus).forEach(([status, data]) => {
    summaryRows.push([status, data.count, fmtCurrency(currency, data.value)]);
  });

  dl(
    new Blob([rowsToCsv(summaryRows)], { type: "text/csv;charset=utf-8;" }),
    `payments_summary_${stamp()}.csv`
  );

  /* ----------------------------------------------------------
     player_payments.csv
     ---------------------------------------------------------- */
  const ppHeader = [
    "playerId",
    "name",
    "disqualified",
    "entry_paid_amount",
    "payment_method",
    "extras_count",
    "extras_amount",
    "total_paid",
  ];

  const ppBody = active.map((p) => {
    const extras = p.extraPayments || {};
    const extrasCount = Object.keys(extras).length;
    const extrasAmount = Object.values(extras).reduce(
      (s: number, v: any) => s + Number(v?.amount || 0),
      0
    );
    const entryPaid = p.paid ? entryFee : 0;
    const totalPaid = entryPaid + extrasAmount;

    return [
      p.id,
      p.name || "",
      p.disqualified ? "yes" : "no",
      entryPaid.toFixed(2),
      p.paymentMethod || "",
      extrasCount,
      extrasAmount.toFixed(2),
      totalPaid.toFixed(2),
    ];
  });

  dl(
    new Blob([rowsToCsv([ppHeader, ...ppBody])], {
      type: "text/csv;charset=utf-8;",
    }),
    `player_payments_${stamp()}.csv`
  );

  /* ----------------------------------------------------------
     ledger.csv
     ---------------------------------------------------------- */
  if (ledger.length) {
    const headerL = [
      "id",
      "ts",
      "type",
      "method",
      "payerId",
      "amount",
      "currency",
      "reasonCode",
      "note",
      "createdBy",
    ];

    const bodyL = ledger.map((l) => [
      esc(l.id),
      esc(l.ts),
      esc(l.type),
      esc(l.method || ""),
      esc(l.payerId || ""),
      Number(l.amount || 0).toFixed(2),
      esc(l.currency || currency),
      esc(l.reasonCode || ""),
      esc(l.note || ""),
      esc(l.createdBy || ""),
    ]);

    dl(
      new Blob([rowsToCsv([headerL, ...bodyL])], {
        type: "text/csv;charset=utf-8;",
      }),
      `ledger_${stamp()}.csv`
    );
  }

  /* ----------------------------------------------------------
     prize_register.csv
     ---------------------------------------------------------- */
  if (awards.length) {
    const prHeader = [
      "prizeAwardId",
      "place",
      "prize_name",
      "prize_value",
      "currency",
      "sponsor",
      "winner_player_id",
      "winner_name",
      "status",
      "method",
      "reference",
      "declared_at",
      "delivered_at",
      "collected_at",
      "status_history",
      "notes",
    ];

    const prBody = awards.map((a) => {
      const history = (a.statusHistory || [])
        .map((h) => {
          const parts = [`${h.status}@${h.at}`];
          if (h.byUserName) parts.push(`by:${h.byUserName}`);
          if (h.note) parts.push(`note:${h.note}`);
          return parts.join(" ");
        })
        .join(" | ");

      const value = Number(a.declaredValue || a.prizeValue || 0);
      const sponsorName =
        typeof a.sponsor === "string"
          ? a.sponsor
          : (a.sponsor as any)?.name || "";

      return [
        a.prizeAwardId,
        a.place ?? "",
        a.prizeName || "",
        value.toFixed(2),
        currency,
        sponsorName,
        a.winnerPlayerId || "",
        a.winnerName || "",
        a.status || "declared",
        a.awardMethod || "",
        a.awardReference || "",
        a.declaredAt || "",
        a.deliveredAt || "",
        a.collectedAt || "",
        history,
        a.note || "",
      ];
    });

    dl(
      new Blob([rowsToCsv([prHeader, ...prBody])], {
        type: "text/csv;charset=utf-8;",
      }),
      `prize_register_${stamp()}.csv`
    );
  }

  /* ----------------------------------------------------------
     final_leaderboard.csv
     ---------------------------------------------------------- */
  if (leaderboard.length) {
    const lbHeader = [
      "rank",
      "player_id",
      "name",
      "score",
      "cumulative_negative_points",
      "points_restored",
      "tiebreaker_bonus",
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
      new Blob([rowsToCsv([lbHeader, ...lbBody])], {
        type: "text/csv;charset=utf-8;",
      }),
      `final_leaderboard_${stamp()}.csv`
    );
  }
}

/* =======================================================================
   ZIP EXPORT — NEW PREMIUM VERSION (Option B)
   ======================================================================= */

export async function makeArchiveZip(payload: Payload) {
  const core = deriveCore(payload);

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
    prizesByStatus,
    totalPrizeValue,
    deliveredValue,
    unclaimedValue,
  } = core;

  const zip = new JSZip();
  const nowIso = new Date().toISOString();
  const nameBase = `quiz_archive_${stamp()}`;
  const zipName = `${nameBase}.zip`;

  const readme = `Quiz Archive
Generated: ${nowIso}

Included files (Ordered - Option B):
1. README.txt
2. reconciliation.json
3. payment_reconciliation.pdf
4. payments_summary.csv
5. player_payments.csv
6. prize_register.csv
7. ledger.csv
8. final_leaderboard.csv
9. MANIFEST.json

Verify:
  shasum -a 256 ${zipName}
`;

  const files: Array<{
    name: string;
    type: "text" | "blob";
    text?: string;
    blob?: Blob;
  }> = [];

  /* ----------------------------------------------------------
     reconciliation.json snapshot
     ---------------------------------------------------------- */
  files.push({
    name: "reconciliation.json",
    type: "text",
    text: JSON.stringify(
      {
        roomId: payload.config?.roomId,
        reconciliation: payload.config?.reconciliation || {},
        currency: payload.config?.currencySymbol || "€",
        entryFee: payload.config?.entryFee,
        generatedAt: nowIso,
        prizeSummary: {
          total: awards.length,
          totalValue: totalPrizeValue,
          deliveredValue,
          unclaimedValue,
          byStatus: Object.entries(prizesByStatus).reduce(
            (acc, [status, d]) => {
              acc[status] = { count: d.count, value: d.value };
              return acc;
            },
            {} as Record<string, { count: number; value: number }>
          ),
        },
      },
      null,
      2
    ),
  });

  /* ----------------------------------------------------------
     README
     ---------------------------------------------------------- */
  files.push({ name: "README.txt", type: "text", text: readme });

  /* ----------------------------------------------------------
     payments_summary.csv (Zip version)
     ---------------------------------------------------------- */

  const summaryHeaderRows: (string | number)[][] = [
    ["Payment Reconciliation"],
    ["Generated At", new Date().toLocaleString()],
    ["Approved By", payload.config?.reconciliation?.approvedBy || "—"],
    ["Approved At", payload.config?.reconciliation?.approvedAt || "—"],
    [],
    ["Entry Fee", fmtCurrency(currency, entryFee)],
    ["Total Players", active.length],
    ["Paid Players", paid.length],
    ["Unpaid Players", unpaid.length],
    ["Extras (count)", totalExtrasCount],
    ["Extras (amount)", fmtCurrency(currency, totalExtrasAmount)],
    ["Received Entry", fmtCurrency(currency, totalEntryReceived)],
    ["Grand Total", fmtCurrency(currency, totalReceived)],
    [],
    ["Payment Method Breakdown"],
    ["payment_method", "entry_fees", "extras_count", "extras_amount", "total", "%_of_total"],
  ];

  const methodRows = Object.keys(methodMap).map((m) => {
    const d = methodMap[m];
    if (!d)
      return [m, "0.00", 0, "0.00", "0.00", "—"] as (string | number)[];
    const pct =
      totalReceived > 0
        ? ((d.total / totalReceived) * 100).toFixed(1) + "%"
        : "—";
    return [
      m,
      d.entry.toFixed(2),
      d.extrasCount,
      d.extrasAmount.toFixed(2),
      d.total.toFixed(2),
      pct,
    ];
  });

  const adjRows: (string | number)[][] = [
    [
      "Total",
      totalEntryReceived.toFixed(2),
      totalExtrasCount,
      totalExtrasAmount.toFixed(2),
      totalReceived.toFixed(2),
      totalReceived > 0 ? "100%" : "—",
    ],
    [],
    ["Adjustments (rollup)"],
    ["fees_total", fees.toFixed(2)],
    ["refunds_total", refunds.toFixed(2)],
    ["other_adjustments_total", otherAdj.toFixed(2)],
    ["net_adjustments", netAdjustments.toFixed(2)],
    [],
    ["Prize Distribution Summary"],
    ["total_prizes", awards.length],
    ["total_value", fmtCurrency(currency, totalPrizeValue)],
    ["delivered_value", fmtCurrency(currency, deliveredValue)],
    ["unclaimed_value", fmtCurrency(currency, unclaimedValue)],
    [],
    ["Prize Status Breakdown"],
    ["status", "count", "total_value"],
  ];

  Object.entries(prizesByStatus).forEach(([status, d]) => {
    adjRows.push([status, d.count, fmtCurrency(currency, d.value)]);
  });

  files.push({
    name: "payments_summary.csv",
    type: "text",
    text: rowsToCsv([...summaryHeaderRows, ...methodRows, ...adjRows]),
  });

  /* ----------------------------------------------------------
     player_payments.csv
     ---------------------------------------------------------- */
  const ppHeader2 = [
    "playerId",
    "name",
    "disqualified",
    "entry_paid_amount",
    "payment_method",
    "extras_count",
    "extras_amount",
    "total_paid",
  ];

  const ppBody2 = active.map((p) => {
    const extras = p.extraPayments || {};
    const extrasCount = Object.keys(extras).length;
    const extrasAmount = Object.values(extras).reduce(
      (s: number, v: any) => s + Number(v?.amount || 0),
      0
    );
    const entryPaid = p.paid ? entryFee : 0;
    const totalPaid = entryPaid + extrasAmount;

    return [
      p.id,
      p.name || "",
      p.disqualified ? "yes" : "no",
      entryPaid.toFixed(2),
      p.paymentMethod || "",
      extrasCount,
      extrasAmount.toFixed(2),
      totalPaid.toFixed(2),
    ];
  });

  files.push({
    name: "player_payments.csv",
    type: "text",
    text: rowsToCsv([ppHeader2, ...ppBody2]),
  });

  /* ----------------------------------------------------------
     prize_register.csv
     ---------------------------------------------------------- */
  if (awards.length) {
    const prHeader = [
      "prizeAwardId",
      "place",
      "prize_name",
      "prize_value",
      "currency",
      "sponsor",
      "winner_player_id",
      "winner_name",
      "status",
      "method",
      "reference",
      "declared_at",
      "delivered_at",
      "collected_at",
      "status_history",
      "notes",
    ];

    const prBody = awards.map((a) => {
      const history = (a.statusHistory || [])
        .map((h) => {
          const parts = [`${h.status}@${h.at}`];
          if (h.byUserName) parts.push(`by:${h.byUserName}`);
          if (h.note) parts.push(`note:${h.note}`);
          return parts.join(" ");
        })
        .join(" | ");

      const value = Number(a.declaredValue || a.prizeValue || 0);
      const sponsorName =
        typeof a.sponsor === "string"
          ? a.sponsor
          : (a.sponsor as any)?.name || "";

      return [
        a.prizeAwardId,
        a.place ?? "",
        a.prizeName || "",
        value.toFixed(2),
        currency,
        sponsorName,
        a.winnerPlayerId || "",
        a.winnerName || "",
        a.status || "declared",
        a.awardMethod || "",
        a.awardReference || "",
        a.declaredAt || "",
        a.deliveredAt || "",
        a.collectedAt || "",
        history,
        a.note || "",
      ];
    });

    files.push({
      name: "prize_register.csv",
      type: "text",
      text: rowsToCsv([prHeader, ...prBody]),
    });
  }

  /* ----------------------------------------------------------
     ledger.csv
     ---------------------------------------------------------- */
  if (ledger.length) {
    const headerL = [
      "id",
      "ts",
      "type",
      "method",
      "payerId",
      "amount",
      "currency",
      "reasonCode",
      "note",
      "createdBy",
    ];

    const bodyL = ledger.map((l) => [
      esc(l.id),
      esc(l.ts),
      esc(l.type),
      esc(l.method || ""),
      esc(l.payerId || ""),
      Number(l.amount || 0).toFixed(2),
      esc(l.currency || currency),
      esc(l.reasonCode || ""),
      esc(l.note || ""),
      esc(l.createdBy || ""),
    ]);

    files.push({
      name: "ledger.csv",
      type: "text",
      text: rowsToCsv([headerL, ...bodyL]),
    });
  }

  /* ----------------------------------------------------------
     final_leaderboard.csv
     ---------------------------------------------------------- */
  if (leaderboard.length) {
    const lbHeader = [
      "rank",
      "player_id",
      "name",
      "score",
      "cumulative_negative_points",
      "points_restored",
      "tiebreaker_bonus",
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

    files.push({
      name: "final_leaderboard.csv",
      type: "text",
      text: rowsToCsv([lbHeader, ...lbBody]),
    });
  }

  /* ----------------------------------------------------------
     BUILD PREMIUM PDF
     ---------------------------------------------------------- */
  const pdfBlob = await buildPaymentReconciliationPdf(payload, { save: false });

  files.push({
    name: "payment_reconciliation.pdf",
    type: "blob",
    blob: pdfBlob,
  });

  /* ----------------------------------------------------------
     MANIFEST + ZIP CREATION
     ---------------------------------------------------------- */

  const manifest: {
    algorithm: "SHA-256";
    createdAt: string;
    files: Array<{ name: string; size: number; sha256: string }>;
  } = { algorithm: "SHA-256", createdAt: nowIso, files: [] };

  for (const f of files) {
    if (f.type === "text") {
      const hex = await sha256HexFromText(f.text!);
      const size = new TextEncoder().encode(f.text!).length;
      manifest.files.push({ name: f.name, size, sha256: hex });
      zip.file(f.name, f.text!);
    } else {
      const hex = await sha256HexFromBlob(f.blob!);
      const size = f.blob!.size;
      manifest.files.push({ name: f.name, size, sha256: hex });
      zip.file(f.name, f.blob!);
    }
  }

  zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  const zipSha = await sha256HexFromBlob(blob);

  dl(blob, zipName);
  dl(
    new Blob([`${zipSha}  ${zipName}\n`], { type: "text/plain;charset=utf-8;" }),
    `${nameBase}.sha256`
  );
}





