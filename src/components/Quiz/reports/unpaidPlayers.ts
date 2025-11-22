// src/utils/pdf/pdfSections/unpaidPlayers.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

export function addUnpaidPlayersPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    currency: string;
    unpaidPlayers: Array<{
      id: string;
      name: string;
      paymentMethod?: string;
      extraPayments?: Record<
        string,
        { amount: number; method?: string }
      >;
      paid: boolean;
    }>;
    entryFee: number;
  }
) {
  // Header + footer
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  // ---- Page Title ----
  addSectionTitle(doc, 'Unpaid Players', y);
  y += 25;

  const unpaid = data.unpaidPlayers || [];

  // ---- CASE 1: All players fully paid ----
  if (unpaid.length === 0) {
    const boxX = 40;
    const boxY = y + 20;
    const boxW = 500;
    const boxH = 80;

    // Background
    doc.setFillColor('#E6F9EC'); // soft green
    doc.setDrawColor('#A7E3B8');
    doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, 'FD');

    doc.setFontSize(16);
    doc.setTextColor('#166534'); // deep green
    doc.text('All players are fully paid.', boxX + 20, boxY + 35);

    doc.setFontSize(12);
    doc.text('No outstanding balances.', boxX + 20, boxY + 60);

    return;
  }

  // ---- CASE 2: Show unpaid players table ----
  const tableRows = unpaid.map((p) => {
    // Compute extras owed (if they were marked paid=false but extras exist)
    const extras = p.extraPayments || {};
    const extrasTotal = Object.values(extras).reduce(
      (s: number, e: any) => s + Number(e.amount || 0),
      0
    );

    const amountOwed = data.entryFee + extrasTotal;

    return [
      p.name || '—',
      p.id,
      `${data.currency}${amountOwed.toFixed(2)}`,
      p.paymentMethod || '—',
    ];
  });

  autoTable(doc, {
    startY: y + 10,
    head: [['Name', 'ID', 'Owed', 'Payment Method']],
    body: tableRows,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    styles: { fontSize: PDF_FONT.body, textColor: PDF_COLORS.textDark },
    headStyles: {
      fillColor: [237, 233, 254], // lavender
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },

    pageBreak: 'auto',
  });
}
