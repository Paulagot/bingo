// src/quiz/components/reports/prizeSummary.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

export function addPrizesSummaryPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    currency: string;
    totalPrizes: number;
    totalPrizeValue: number;
    deliveredCount: number;
    deliveredValue: number;
    unclaimedCount: number;
    unclaimedValue: number;
    prizesByStatus: Record<string, { count: number; value: number }>;
  }
) {
  // Add header/footer
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  // ---- Section title ----
  addSectionTitle(doc, 'Prize Summary', y);
  y += 30;

  // If no prizes exist -----------------------------------------
  if (data.totalPrizes === 0) {
    doc.setFillColor('#FFF7ED'); // subtle orange background
    doc.setDrawColor('#FED7AA');
    doc.roundedRect(40, y, 500, 70, 8, 8, 'FD');

    doc.setFontSize(16);
    doc.setTextColor('#9A3412');
    doc.text('No prizes were configured for this quiz.', 55, y + 35);

    doc.setFontSize(12);
    doc.text('Prize section omitted.', 55, y + 55);

    return;
  }

  // ---- Summary Cards Layout ----
  const cardW = 250;
  const cardH = 65;
  const leftX = 40;
  const rightX = 40 + cardW + 20;

  const drawCard = (x: number, y: number, label: string, value: string) => {
    doc.setFillColor('#FFFFFF');
    doc.setDrawColor(PDF_COLORS.border);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, 'FD');

    doc.setFontSize(PDF_FONT.small);
    doc.setTextColor(PDF_COLORS.textLight);
    doc.text(label, x + 12, y + 18);

    doc.setFontSize(16);
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text(value, x + 12, y + 42);
  };

  // Row 1
  drawCard(leftX, y, 'Total Prizes', `${data.totalPrizes}`);
  drawCard(rightX, y, 'Total Prize Value', `${data.currency}${data.totalPrizeValue.toFixed(2)}`);
  y += cardH + 20;

  // Row 2
  drawCard(
    leftX,
    y,
    'Delivered / Collected',
    `${data.deliveredCount} (${data.currency}${data.deliveredValue.toFixed(2)})`
  );

  drawCard(
    rightX,
    y,
    'Unclaimed / Refused',
    `${data.unclaimedCount} (${data.currency}${data.unclaimedValue.toFixed(2)})`
  );
  y += cardH + 40;

  // ---- Status Breakdown Table ----
  addSectionTitle(doc, 'Prize Status Breakdown', y);
  y += 15;

  const rows = Object.entries(data.prizesByStatus).map(([status, info]) => [
    status,
    `${info.count}`,
    `${data.currency}${info.value.toFixed(2)}`,
  ]);

  if (rows.length === 0) {
    doc.setFontSize(PDF_FONT.body);
    doc.setTextColor(PDF_COLORS.textLight);
    doc.text('No prize statuses recorded.', 40, y + 18);
    return;
  }

  autoTable(doc, {
    startY: y + 5,
    head: [['Status', 'Count', 'Total Value']],
    body: rows,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    styles: { fontSize: PDF_FONT.body, textColor: PDF_COLORS.textDark },
    headStyles: {
      fillColor: [237, 233, 254],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    pageBreak: 'auto',
  });
}
