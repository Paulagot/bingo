// src/quiz/components/reports/methodBreakdown.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

export function addMethodBreakdownPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    currency: string;
    methodMap: Record<
      string,
      { entry: number; extrasAmount: number; extrasCount: number; total: number }
    >;
    totalReceived: number;
    totalEntryReceived: number;
    totalExtrasCount: number;
    totalExtrasAmount: number;
  }
) {
  // Apply header/footer
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  addSectionTitle(doc, 'Payment Method Breakdown', y);
  y += 20;

  const methodRows = Object.entries(data.methodMap).map(([method, m]) => {
    const pct =
      data.totalReceived > 0
        ? `${((m.total / data.totalReceived) * 100).toFixed(1)}%`
        : '—';

    return [
      method,
      m.entry.toFixed(2),
      `${m.extrasCount}`,
      m.extrasAmount.toFixed(2),
      m.total.toFixed(2),
      pct,
    ];
  });

  autoTable(doc, {
    startY: y + 10,
    head: [['Method', 'Entry Fees', 'Extras (count)', 'Extras (amount)', 'Total', '%']],
    body: methodRows,
    styles: {
      fontSize: PDF_FONT.body,
      textColor: PDF_COLORS.textDark,
    },
    headStyles: {
      fillColor: [237, 233, 254], // lavender start
      textColor: PDF_COLORS.textDark,
      fontSize: PDF_FONT.body,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 255],
    },
    theme: 'grid',
    margin: { left: 40, right: 40 },

    // Add total footer row
    foot: [
      [
        { content: 'Total', styles: { fontStyle: 'bold' } },
        { content: data.totalEntryReceived.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: String(data.totalExtrasCount), styles: { fontStyle: 'bold' } },
        { content: data.totalExtrasAmount.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.totalReceived.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.totalReceived > 0 ? '100%' : '—', styles: { fontStyle: 'bold' } },
      ],
    ],

    // Automatic page breaks if needed
    pageBreak: 'auto',
  });
}
