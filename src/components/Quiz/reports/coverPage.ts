// src/quiz/components/reports/coverPage.ts
import { jsPDF } from 'jspdf';
import {
  PDF_COLORS,
  PDF_FONT,
  drawHeaderGradient,
  addPageHeaderFooter,
} from './pdfStyles';

/**
 * Generates the clean cover page (page 1) for the Payment Reconciliation PDF.
 * No page header at the top — clean title block with subtle lavender accent.
 */
export function addCoverPage(
  doc: jsPDF,
  roomId: string | undefined,
  approvedBy: string | undefined,
  approvedAt: string | undefined,
  generatedAt: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- Title ----
  doc.setFontSize(28);
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text(
    'Payment Reconciliation Report',
    pageWidth / 2,
    100,
    { align: 'center' }
  );

  // Subtle lavender underline
  doc.setDrawColor(PDF_COLORS.gradientEnd);
  doc.setLineWidth(2);
  doc.line(
    pageWidth / 2 - 100,
    110,
    pageWidth / 2 + 100,
    110
  );

  // ---- Metadata Block ----
  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(PDF_COLORS.textLight);

  const lines = [
    `Room ID: ${roomId || '—'}`,
    `Generated At: ${generatedAt}`,
    `Approved By: ${approvedBy || '—'}`,
    `Approved At: ${approvedAt || '—'}`,
  ];

  let offset = 150;
  lines.forEach((txt) => {
    doc.text(txt, pageWidth / 2, offset, { align: 'center' });
    offset += 18;
  });

  // ---- Bottom gradient bar (end of cover page) ----
  drawHeaderGradient(doc, 260);

  // ---- Footer for cover page ----
  addPageHeaderFooter(doc, 1, undefined, generatedAt);
}
