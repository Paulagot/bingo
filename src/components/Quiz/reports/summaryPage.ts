// src/quiz/components/reports/methodBreakdown.ts
import { jsPDF } from 'jspdf';

import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

export function addSummaryPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    currency: string;
    entryFee: number;
    totalPlayers: number;
    paidPlayers: number;
    unpaidPlayers: number;
    extrasCount: number;
    extrasAmount: number;
    totalEntryReceived: number;
    totalReceived: number;
  }
) {
  // Required because this page *does* have header & footer
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  // ---- Title ----
  addSectionTitle(doc, 'Financial Overview', y);
  y += 30;

  // ---- Card Styles ----
  const cardWidth = 230;
  const cardHeight = 55;
  const leftX = 40;
  const rightX = leftX + cardWidth + 20;

  const drawCard = (x: number, y: number, label: string, value: string, highlight = false) => {
    doc.setFillColor(highlight ? PDF_COLORS.gradientStart : '#FFFFFF');
    doc.setDrawColor(PDF_COLORS.border);
    doc.setLineWidth(0.7);

    doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'FD');

    doc.setFontSize(PDF_FONT.small);
    doc.setTextColor(PDF_COLORS.textLight);
    doc.text(label, x + 12, y + 18);

    doc.setFontSize(16);
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text(value, x + 12, y + 40);
  };

  // ---- Row 1 ----
  drawCard(leftX, y, 'Entry Fee', `${data.currency}${data.entryFee.toFixed(2)}`);
  drawCard(rightX, y, 'Total Players', `${data.totalPlayers}`);
  y += cardHeight + 20;

  // ---- Row 2 ----
  drawCard(leftX, y, 'Paid Players', `${data.paidPlayers}`);
  drawCard(rightX, y, 'Unpaid Players', `${data.unpaidPlayers}`);
  y += cardHeight + 20;

  // ---- Row 3 ----
  drawCard(leftX, y, 'Extras Count', `${data.extrasCount}`);
  drawCard(rightX, y, 'Extras Amount', `${data.currency}${data.extrasAmount.toFixed(2)}`);
  y += cardHeight + 20;

  // ---- Row 4 ----
  drawCard(leftX, y, 'Entry Fees Received', `${data.currency}${data.totalEntryReceived.toFixed(2)}`);
  drawCard(rightX, y, 'Total Received', `${data.currency}${data.totalReceived.toFixed(2)}`);
  y += cardHeight + 40;

  // ---- Big Final Total Box ----
  doc.setFillColor(PDF_COLORS.gradientEnd);
  doc.roundedRect(40, y, 500, 70, 8, 8, 'F');

  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setTextColor('#4B5563');
  doc.text('Final Total', 55, y + 28);

  doc.setFontSize(26);
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text(`${data.currency}${data.totalReceived.toFixed(2)}`, 55, y + 58);
}
