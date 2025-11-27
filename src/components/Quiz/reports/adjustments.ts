// src/utils/pdf/pdfSections/adjustments.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

/**
 * Create the "Adjustments" page in the Payment Reconciliation PDF.
 * Includes roll-up summary + full notes from ledger rows.
 */
export function addAdjustmentsPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    currency: string;
    fees: number;
    refunds: number;
    otherAdj: number;
    netAdjustments: number;
    ledger: Array<{
      type: string;
      amount: number;
      note?: string;
      reasonCode?: string;
    }>;
  }
) {
  // ---- Header / Footer ----
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  // ---- Section Title ----
  addSectionTitle(doc, 'Adjustments', y);
  y += 20;

  // ---- Adjustments Roll-up Table ----
  const rows = [
    ['Fees Total', `${data.currency}${data.fees.toFixed(2)}`],
    ['Refunds Total', `${data.currency}${data.refunds.toFixed(2)}`],
    ['Other Adjustments', `${data.currency}${data.otherAdj.toFixed(2)}`],
    ['Net Adjustments', `${data.currency}${data.netAdjustments.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: y + 10,
    head: [['Adjustment Type', 'Amount']],
    body: rows,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: PDF_FONT.body,
      textColor: PDF_COLORS.textDark,
    },
    headStyles: {
      fillColor: [237, 233, 254], // lavender
      textColor: PDF_COLORS.textDark,
      fontStyle: 'bold',
    },
    pageBreak: 'auto',
  });

  // Track where the table ended
  let bottomY = (doc as any).lastAutoTable.finalY + 25;

  // ---- Notes Section ----
  addSectionTitle(doc, 'Notes & Comments', bottomY);
  bottomY += 18;

  const notes = data.ledger
    .filter((l) => l.note && l.note.trim() !== '')
    .map(
      (l) =>
        `• ${l.note} ` +
        (l.reasonCode ? `(Reason: ${l.reasonCode})` : '')
    );

  if (notes.length === 0) {
    doc.setFontSize(PDF_FONT.body);
    doc.setTextColor(PDF_COLORS.textLight);
    doc.text('No notes were recorded for adjustments.', 40, bottomY + 12);
    return;
  }

  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(PDF_COLORS.textDark);

  let cursor = bottomY;

  // Write each note and auto-wrap to new page when needed
  notes.forEach((line) => {
    const pageHeight = doc.internal.pageSize.getHeight();

    // If near bottom → new page
    if (cursor > pageHeight - 80) {
      doc.addPage();
      cursor = 60;
      // Re-apply header/footer on new pages
      addPageHeaderFooter(
        doc,
        pageNumber + 1, // dynamic index will be fixed in final orchestrator
        undefined,
        generatedAt
      );
    }

    const textLines = doc.splitTextToSize(line, 500);
    doc.text(textLines, 40, cursor);
    cursor += textLines.length * 14 + 4;
  });
}
