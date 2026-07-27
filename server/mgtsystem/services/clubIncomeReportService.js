// server/mgtsystem/services/clubIncomeReportService.js
//
// Data layer for the club-wide Total Income Report (the button-driven
// modal). ONE endpoint, ONE money source per category, assembled here so
// the frontend is pure rendering.
//
// Category rules (agreed):
//   tickets        → ledger rows where ticket_id IS NOT NULL/''  (pre-sold)
//   subscriptions  → ledger rows where payment_reference LIKE 'sub\_%'
//   other          → every other ledger row (on-the-night etc.)
//   donations      → fundraisely_donations (separate table by design)
//
// Status filter: ledger status = 'confirmed' ONLY. Nothing in this
// codebase ever writes status='reconciled' — the reconciliation stamp is
// reconciliation_id/reconciled_at with status left at 'confirmed' — so
// 'confirmed' is both correct and consistent with the recon queries.
// (The IN ('confirmed','reconciled') in quizStatsService is dead weight.)
//
// Ticket money comes from the LEDGER, not quiz_tickets. quiz_tickets
// provides the by-type LABELS only, plus a variance check: if the two
// tables disagree, the report says so instead of hiding it behind
// whichever table happened to be queried.
//
// Adjustments: classified via the shared classifier (single source of
// truth). Approved vs pending split via join to quiz_reconciliation —
// approved figures go in the main report, pending shown separately.
// Elimination adjustments never get reconciliation_id stamped, so the
// join falls back to room_id for NULL reconciliation_id rows (safe:
// elimination is one reconciliation per room; the period-based
// activities always set reconciliation_id so they never hit the
// fallback).

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { classifyAdjustment } from '../../shared/adjustmentClassifier.js';

const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;
const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const DONATIONS_TABLE = `${TABLE_PREFIX}donations`;
const ADJ_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const RECON_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
const EVENTS_TABLE = `${TABLE_PREFIX}events`;

// ─── 1. Ledger income, categorized + by method ───────────────────────────────

async function fetchLedgerIncome(clubId) {
  // \_ escapes the underscore — plain 'sub_%' would match 'subX…' too,
  // since _ is a single-char wildcard in LIKE.
  const [rows] = await connection.execute(
    `SELECT
       CASE
         WHEN ticket_id IS NOT NULL AND ticket_id != '' THEN 'tickets'
         WHEN payment_reference LIKE 'sub\\_%' THEN 'subscriptions'
         ELSE 'other'
       END AS category,
       COALESCE(payment_method, 'unknown') AS payment_method,
       COUNT(*) AS cnt,
       SUM(amount) AS total
     FROM ${LEDGER_TABLE}
     WHERE club_id = ?
       AND status = 'confirmed'
     GROUP BY category, payment_method
     ORDER BY category, total DESC`,
    [clubId]
  );

  const empty = () => ({ total: 0, count: 0, byMethod: [] });
  const categories = { tickets: empty(), subscriptions: empty(), other: empty() };

  for (const r of rows) {
    const cat = categories[r.category];
    const total = parseFloat(r.total) || 0;
    const count = Number(r.cnt) || 0;
    cat.total += total;
    cat.count += count;
    cat.byMethod.push({ method: r.payment_method, total, count });
  }
  return categories;
}

// ─── 2. Ticket type breakdown (labels + variance source) ─────────────────────

async function fetchTicketTypes(clubId) {
  const [rows] = await connection.execute(
    `SELECT
       COALESCE(ticket_type_name, 'General') AS ticket_type_name,
       COUNT(*) AS ticket_count,
       SUM(total_amount) AS total_amount,
       currency
     FROM ${TICKETS_TABLE}
     WHERE club_id = ?
       AND payment_status = 'payment_confirmed'
     GROUP BY COALESCE(ticket_type_name, 'General'), currency
     ORDER BY total_amount DESC`,
    [clubId]
  );

  const byType = rows.map((r) => ({
    ticketTypeName: r.ticket_type_name,
    ticketCount: Number(r.ticket_count) || 0,
    totalAmount: parseFloat(r.total_amount) || 0,
    currency: r.currency,
  }));

  return {
    byType,
    ticketsTableTotal: byType.reduce((s, t) => s + t.totalAmount, 0),
    ticketsTableCount: byType.reduce((s, t) => s + t.ticketCount, 0),
  };
}

// ─── 3. Donations by method category ─────────────────────────────────────────

async function fetchDonations(clubId) {
  const [rows] = await connection.execute(
    `SELECT
       COALESCE(payment_method_category_snapshot, 'other') AS category,
       COUNT(*) AS cnt,
       SUM(amount) AS total
     FROM ${DONATIONS_TABLE}
     WHERE club_id = ?
       AND status = 'confirmed'
     GROUP BY category
     ORDER BY total DESC`,
    [clubId]
  );

  const byMethod = rows.map((r) => ({
    method: r.category,
    total: parseFloat(r.total) || 0,
    count: Number(r.cnt) || 0,
  }));

  return {
    total: byMethod.reduce((s, m) => s + m.total, 0),
    count: byMethod.reduce((s, m) => s + m.count, 0),
    byMethod,
  };
}

// ─── 3b. Donation detail rows (for the expandable table) ─────────────────────

async function fetchDonationRows(clubId) {
  const [rows] = await connection.execute(
    `SELECT id, donor_name, donor_email, amount, currency,
            payment_method_category_snapshot AS method_category,
            payment_method_label_snapshot AS method_label,
            crypto_chain, crypto_token_code, crypto_raw_amount, crypto_sender_wallet,
            confirmed_at, created_at
     FROM ${DONATIONS_TABLE}
     WHERE club_id = ? AND status = 'confirmed'
     ORDER BY confirmed_at DESC, created_at DESC`,
    [clubId]
  );
  return rows.map((d) => ({
    id: d.id,
    donorName: d.donor_name || 'Anonymous',
    donorEmail: d.donor_email,
    amount: parseFloat(d.amount) || 0,
    currency: d.currency,
    methodCategory: d.method_category,
    methodLabel: d.method_label,
    isCrypto: d.method_category === 'crypto',
    cryptoChain: d.crypto_chain,
    cryptoTokenCode: d.crypto_token_code,
    cryptoRawAmount: d.crypto_raw_amount,
    cryptoSenderWallet: d.crypto_sender_wallet,
    confirmedAt: d.confirmed_at,
  }));
}

// ─── 4. Adjustments, classified, approved vs pending ─────────────────────────

async function fetchAdjustments(clubId) {
  // Correlated-subquery fallback for elimination's NULL reconciliation_id
  // (one reconciliation per room, so LIMIT 1 by latest id is exact for
  // elimination and never fires for period-based rows, which always set
  // reconciliation_id).
  const [rows] = await connection.execute(
    `SELECT
       a.adjustment_type,
       a.reason_code,
       COALESCE(a.payment_method, 'unknown') AS payment_method,
       CASE WHEN r.approved_at IS NOT NULL THEN 1 ELSE 0 END AS approved,
       COUNT(*) AS cnt,
       SUM(a.amount) AS total
     FROM ${ADJ_TABLE} a
     LEFT JOIN ${RECON_TABLE} r
       ON r.id = COALESCE(
            a.reconciliation_id,
            (SELECT r2.id FROM ${RECON_TABLE} r2
             WHERE r2.room_id = a.room_id
             ORDER BY r2.id DESC LIMIT 1)
          )
     WHERE a.club_id = ?
     GROUP BY a.adjustment_type, a.reason_code, payment_method, approved
     ORDER BY approved DESC, total DESC`,
    [clubId]
  );

  const bucket = () => ({ income: 0, expense: 0, incomeByType: [], expenseByType: [] });
  const approved = bucket();
  const pending = bucket();
  const unclassified = [];

  for (const r of rows) {
    const total = parseFloat(r.total) || 0;
    const count = Number(r.cnt) || 0;
    const kind = classifyAdjustment({
      adjustmentType: r.adjustment_type,
      reasonCode: r.reason_code,
    });
    const target = r.approved ? approved : pending;
    const entry = {
      adjustmentType: r.adjustment_type,
      reasonCode: r.reason_code,
      method: r.payment_method,
      total,
      count,
    };

    if (kind === 'income') {
      target.income += total;
      target.incomeByType.push(entry);
    } else if (kind === 'expense') {
      target.expense += total;
      target.expenseByType.push(entry);
    } else {
      unclassified.push({ ...entry, approved: !!r.approved });
    }
  }

  return { approved, pending, unclassified };
}

// ─── 4b. Individual approved adjustment rows (for expandable detail) ─────────

async function fetchApprovedAdjustmentRows(clubId) {
  const [rows] = await connection.execute(
    `SELECT a.id, a.room_id, a.adjustment_type, a.reason_code,
            COALESCE(a.payment_method, 'unknown') AS payment_method,
            a.amount, a.note, a.created_by,
            COALESCE(a.ts, a.created_at) AS ts
     FROM ${ADJ_TABLE} a
     JOIN ${RECON_TABLE} r
       ON r.id = COALESCE(
            a.reconciliation_id,
            (SELECT r2.id FROM ${RECON_TABLE} r2
             WHERE r2.room_id = a.room_id
             ORDER BY r2.id DESC LIMIT 1)
          )
     WHERE a.club_id = ?
       AND r.approved_at IS NOT NULL
     ORDER BY ts DESC, a.id DESC`,
    [clubId]
  );

  return rows
    .map((r) => ({
      id: r.id,
      roomId: r.room_id,
      adjustmentType: r.adjustment_type,
      reasonCode: r.reason_code,
      method: r.payment_method,
      amount: parseFloat(r.amount) || 0,
      note: r.note,
      createdBy: r.created_by,
      ts: r.ts,
      kind: classifyAdjustment({
        adjustmentType: r.adjustment_type,
        reasonCode: r.reason_code,
      }),
    }))
    // Unclassified rows are already surfaced via unclassifiedAdjustments;
    // keeping them out here keeps the income/expense lists' sums matching
    // the section totals exactly.
    .filter((r) => r.kind !== 'unclassified');
}

// ─── 5. Target from events ───────────────────────────────────────────────────

async function fetchTarget(clubId) {
  // Sums EVERY event goal, drafts included. Original version excluded
  // status='draft', but in practice events sit in draft while very much
  // live for fundraising (verified against real club data: all events
  // were drafts, target came back 0). If a publish workflow starts being
  // used, revisit — add AND status != 'draft' back or filter on
  // is_published = 1.
  const [[row]] = await connection.execute(
    `SELECT COALESCE(SUM(goal_amount), 0) AS target
     FROM ${EVENTS_TABLE}
     WHERE club_id = ?
       AND goal_amount > 0`,
    [clubId]
  );
  return parseFloat(row?.target) || 0;
}

// ─── Assemble ────────────────────────────────────────────────────────────────

export async function buildClubIncomeReport(clubId) {
  const [ledger, ticketTypes, donations, donationRows, adjustments, adjustmentRows, target] = await Promise.all([
    fetchLedgerIncome(clubId),
    fetchTicketTypes(clubId),
    fetchDonations(clubId),
    fetchDonationRows(clubId),
    fetchAdjustments(clubId),
    fetchApprovedAdjustmentRows(clubId),
    fetchTarget(clubId),
  ]);

  const adjustmentIncome = adjustments.approved.income;
  const expensesTotal = adjustments.approved.expense;

  // Gross = all income, NO expenses. This is the number measured against
  // target, per spec.
  const grossIncome =
    ledger.tickets.total +
    ledger.subscriptions.total +
    ledger.other.total +
    donations.total +
    adjustmentIncome;

  const netIncome = grossIncome - expensesTotal;

  // Variance: ledger vs quiz_tickets. Non-zero means the two tables are
  // out of sync for at least one payment — surfaced, not hidden.
  const ticketsVariance = {
    ledgerTotal: ledger.tickets.total,
    ticketsTableTotal: ticketTypes.ticketsTableTotal,
    delta: ledger.tickets.total - ticketTypes.ticketsTableTotal,
  };

  return {
    target,
    grossIncome,
    progressPct: target > 0 ? Math.min(100, (grossIncome / target) * 100) : 0,
    income: {
      tickets: {
        ...ledger.tickets,
        byType: ticketTypes.byType,
        typeCount: ticketTypes.ticketsTableCount,
      },
      subscriptions: ledger.subscriptions,
      other: ledger.other,
      donations,
      adjustmentIncome: {
        total: adjustmentIncome,
        byType: adjustments.approved.incomeByType,
      },
    },
    expenses: {
      total: expensesTotal,
      byType: adjustments.approved.expenseByType,
    },
    donationRows,
    adjustmentRows,
    pendingAdjustments: {
      income: adjustments.pending.income,
      expense: adjustments.pending.expense,
      net: adjustments.pending.income - adjustments.pending.expense,
      count:
        adjustments.pending.incomeByType.reduce((s, e) => s + e.count, 0) +
        adjustments.pending.expenseByType.reduce((s, e) => s + e.count, 0),
    },
    unclassifiedAdjustments: adjustments.unclassified,
    netIncome,
    ticketsVariance,
  };
}