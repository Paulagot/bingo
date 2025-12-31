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

    // ✅ Simplified status history for better display
    const recentStatus = (a.statusHistory || []).slice(-2).map((h) => {
      return `${h.status} (${new Date(h.at).toLocaleDateString()})`;
    }).join(', ') || a.status || '';

    // ✅ Format dates more compactly
    const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
      } catch {
        return dateStr;
      }
    };

    return [
      a.place ?? '',
      a.prizeName || '',
      `${data.currency}${val.toFixed(2)}`,
      sponsorName,
      a.winnerName || '',
      a.status || '',
      a.awardMethod || '',
      a.awardReference || '',
      formatDate(a.declaredAt),
      formatDate(a.deliveredAt),
      recentStatus,
    ];
  });

  // ---- AutoTable with optimized column widths ----
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
        'Recent Activity',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: 8, // ✅ Reduced from 10 to fit more
      textColor: PDF_COLORS.textDark,
      cellWidth: 'wrap',
      valign: 'top',
      cellPadding: 2, // ✅ Reduced padding
    },
    headStyles: {
      fillColor: [237, 233, 254],
      fontStyle: 'bold',
      textColor: PDF_COLORS.textDark,
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 255],
    },
    // ✅ FIXED: Optimized column widths that total ~515 points (fits within margins)
    columnStyles: {
      0: { cellWidth: 30 },   // Place (was 35)
      1: { cellWidth: 75 },   // Prize (was 100)
      2: { cellWidth: 45 },   // Value (was 60)
      3: { cellWidth: 55 },   // Sponsor (was 80)
      4: { cellWidth: 55 },   // Winner (was 80)
      5: { cellWidth: 45 },   // Status (was 60)
      6: { cellWidth: 40 },   // Method (was 55)
      7: { cellWidth: 40 },   // Reference (was 55)
      8: { cellWidth: 35 },   // Declared (was 70, now compact date)
      9: { cellWidth: 35 },   // Delivered (was 70, now compact date)
      10: { cellWidth: 60 },  // Recent Activity (was 160 for full history)
    },
    // Total: 30+75+45+55+55+45+40+40+35+35+60 = 515 points ✅

    pageBreak: 'auto',
  });

  // ✅ Add note about detailed history if there's space
  const finalY = (doc as any).lastAutoTable.finalY;
  if (finalY < doc.internal.pageSize.getHeight() - 100) {
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.textLight);
    doc.text(
      'Note: Full status history available in reconciliation.json file',
      40,
      finalY + 15
    );
  }
}
