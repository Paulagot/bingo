// src/utils/pdf/pdfSections/prizeRegister.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

export function addPrizeRegisterPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    currency: string;
    awards: Array<{
      prizeAwardId: string;
      prizeId?: string | number;
      place?: number;
      prizeName?: string;
      prizeType?: string;
      declaredValue?: number | null;
      prizeValue?: number;
      sponsor?: { name?: string } | string | null;
      winnerPlayerId?: string;
      winnerName?: string;
      status?: string;
      declaredAt?: string;
      deliveredAt?: string;
      collectedAt?: string;
      awardMethod?: string;
      awardReference?: string;
      note?: string;
      statusHistory?: Array<{
        status: string;
        at: string;
        byUserName?: string;
        note?: string;
      }>;
    }>;
  }
) {
  // Header/footer
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  // ---- Title ----
  addSectionTitle(doc, 'Prize Register (Full Detail)', y);
  y += 25;

  const { awards } = data;

  if (!awards || awards.length === 0) {
    doc.setFillColor('#FFF7ED');
    doc.setDrawColor('#FED7AA');
    doc.roundedRect(40, y + 10, 500, 70, 8, 8, 'FD');

    doc.setFontSize(16);
    doc.setTextColor('#9A3412');
    doc.text('No prize awards were recorded for this quiz.', 55, y + 40);

    return;
  }

  // ---- Build rows ----
  const tableRows = awards.map((a) => {
    const val = Number(a.declaredValue || a.prizeValue || 0);

    const sponsorName =
      typeof a.sponsor === 'string'
        ? a.sponsor
        : a.sponsor?.name || '';

    const history = (a.statusHistory || [])
      .map((h) => {
        const parts = [`${h.status} @ ${h.at}`];
        if (h.byUserName) parts.push(`by ${h.byUserName}`);
        if (h.note) parts.push(`note: ${h.note}`);
        return parts.join(' • ');
      })
      .join(' | ');

    return [
      a.place ?? '',
      a.prizeName || '',
      `${data.currency}${val.toFixed(2)}`,
      sponsorName,
      a.winnerName || '',
      a.status || '',
      a.awardMethod || '',
      a.awardReference || '',
      a.declaredAt || '',
      a.deliveredAt || '',
      a.collectedAt || '',
      history,
    ];
  });

  // ---- AutoTable ----
  autoTable(doc, {
    startY: y + 10,
    head: [
      [
        'Place',
        'Prize',
        'Value',
        'Sponsor',
        'Winner',
        'Status',
        'Method',
        'Ref',
        'Declared',
        'Delivered',
        'Collected',
        'History',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: PDF_FONT.body,
      textColor: PDF_COLORS.textDark,
      cellWidth: 'wrap',
      valign: 'top',
    },
    headStyles: {
      fillColor: [237, 233, 254],
      fontStyle: 'bold',
      textColor: PDF_COLORS.textDark,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 255],
    },
    // Allow wrapping but keep columns readable
    columnStyles: {
      0: { cellWidth: 35 },   // place
      1: { cellWidth: 100 },  // prize
      2: { cellWidth: 60 },   // value
      3: { cellWidth: 80 },   // sponsor
      4: { cellWidth: 80 },   // winner
      5: { cellWidth: 60 },   // status
      6: { cellWidth: 55 },   // method
      7: { cellWidth: 55 },   // reference
      8: { cellWidth: 70 },   // declared
      9: { cellWidth: 70 },   // delivered
      10: { cellWidth: 70 },  // collected
      11: { cellWidth: 160 }, // history (largest)
    },

    pageBreak: 'auto',
  
  });
}
