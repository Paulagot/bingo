// src/utils/pdf/buildPaymentReconciliationPdf.ts

import { jsPDF } from 'jspdf';

// Section imports
import { addCoverPage } from './coverPage';
import { addSummaryPage } from './summaryPage';
import { addMethodBreakdownPage } from './methodBreakdown';
import { addAdjustmentsPage } from './adjustments';
import { addUnpaidPlayersPage } from './unpaidPlayers';
import { addPrizesSummaryPage } from './prizeSummary';
import { addPrizeRegisterPage } from './prizeRegister';
import { addFinalLeaderboardPage } from './leaderboard';

// Style helpers
// import { PDF_FONT, PDF_COLORS } from './pdfStyles';

// Utility (this exists already in your reportExport)
import { deriveCore } from './deriveCore';
// If deriveCore is not exported, I will help you extract it into its own module.


/**
 * Builds the full multi-page Payment Reconciliation PDF.
 * Returns Blob by default, but can also auto-save.
 */
export async function buildPaymentReconciliationPdf(payload: any, opts?: { save?: boolean }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const generatedAt = new Date().toLocaleString();

  const approvedBy = payload?.reconciliation?.approvedBy ?? '';
const approvedAt = payload?.reconciliation?.approvedAt ?? null;

  // -------------------------------
  // 1. ANALYZE CORE DATA
  // -------------------------------
  const core = deriveCore(payload);

  // -------------------------------
  // PAGE COUNTER
  // -------------------------------
  let pageNumber = 1;

  // -------------------------------
  // 2. COVER PAGE
  // -------------------------------
addCoverPage(
  doc,
  payload,
  generatedAt,
  approvedBy,
  approvedAt
)
  pageNumber++;

  // -------------------------------
  // 3. SUMMARY PAGE
  // -------------------------------
  doc.addPage();
  addSummaryPage(doc, pageNumber++, generatedAt, {
    currency: core.currency,
    entryFee: core.entryFee,
    totalPlayers: core.active.length,
    paidPlayers: core.paid.length,
    unpaidPlayers: core.unpaid.length,
    extrasCount: core.totalExtrasCount,
    extrasAmount: core.totalExtrasAmount,
    totalEntryReceived: core.totalEntryReceived,
    totalReceived: core.totalReceived,
  });

  // -------------------------------
  // 4. METHOD BREAKDOWN
  // -------------------------------
  doc.addPage();
  addMethodBreakdownPage(doc, pageNumber++, generatedAt, {
    currency: core.currency,
    methodMap: core.methodMap,
    totalReceived: core.totalReceived,
    totalEntryReceived: core.totalEntryReceived,
    totalExtrasCount: core.totalExtrasCount,
    totalExtrasAmount: core.totalExtrasAmount,
  });

  // -------------------------------
  // 5. ADJUSTMENTS
  // -------------------------------
  doc.addPage();
  addAdjustmentsPage(doc, pageNumber++, generatedAt, {
    currency: core.currency,
    fees: core.fees,
    refunds: core.refunds,
    otherAdj: core.otherAdj,
    netAdjustments: core.netAdjustments,
    ledger: core.ledger,
  });

  // -------------------------------
  // 6. UNPAID PLAYERS
  // -------------------------------
  doc.addPage();
  addUnpaidPlayersPage(doc, pageNumber++, generatedAt, {
    currency: core.currency,
    unpaidPlayers: core.unpaid,
    entryFee: core.entryFee,
  });

  // -------------------------------
  // 7. PRIZE SUMMARY
  // -------------------------------
  doc.addPage();
  addPrizesSummaryPage(doc, pageNumber++, generatedAt, {
    currency: core.currency,
    totalPrizes: core.awards.length,
    totalPrizeValue: core.totalPrizeValue,
    deliveredCount: core.deliveredCount,
    deliveredValue: core.deliveredValue,
    unclaimedCount: core.unclaimedCount,
    unclaimedValue: core.unclaimedValue,
    prizesByStatus: core.prizesByStatus,
  });

  // -------------------------------
  // 8. PRIZE REGISTER (FULL AUDIT)
  // -------------------------------
  doc.addPage();
addPrizeRegisterPage(doc, pageNumber++, generatedAt, {
  currency: core.currency,
  awards: core.awards.map(a => ({
    ...a,
    declaredValue: a.declaredValue ?? 0,
    prizeValue: a.prizeValue ?? 0,   // 🔥 NEW FIX
  })),
});


  // -------------------------------
  // 9. FINAL LEADERBOARD
  // -------------------------------
  doc.addPage();
  addFinalLeaderboardPage(doc, pageNumber++, generatedAt, {
    leaderboard: core.leaderboard,
  });

  // -------------------------------
  // RETURN OR SAVE
  // -------------------------------
  if (opts?.save) {
    const fileName = `payment_reconciliation_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  return doc.output('blob');
}
