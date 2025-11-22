// src/utils/pdf/pdfSections/finalLeaderboard.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPageHeaderFooter,
  addSectionTitle,
  PDF_COLORS,
  PDF_FONT,
} from './pdfStyles';

export function addFinalLeaderboardPage(
  doc: jsPDF,
  pageNumber: number,
  generatedAt: string,
  data: {
    leaderboard: Array<{
      rank: number;
      id: string;
      name: string;
      score: number;
      cumulativeNegativePoints: number;
      pointsRestored: number;
      tiebreakerBonus: number;
    }>;
  }
) {
  // Header + footer
  addPageHeaderFooter(doc, pageNumber, undefined, generatedAt);

  let y = 70;

  // ---- Title ----
  addSectionTitle(doc, 'Final Leaderboard', y);
  y += 25;

  const rows = data.leaderboard.map((p) => [
    p.rank,
    p.name || '—',
    p.score,
    p.cumulativeNegativePoints,
    p.pointsRestored,
    p.tiebreakerBonus,
  ]);

  // If no leaderboard found
  if (rows.length === 0) {
    doc.setFillColor('#FEF3C7');
    doc.setDrawColor('#FCD34D');
    doc.roundedRect(40, y + 10, 500, 70, 8, 8, 'FD');

    doc.setFontSize(16);
    doc.setTextColor('#92400E');
    doc.text('No leaderboard data was found.', 55, y + 45);
    return;
  }

  autoTable(doc, {
    startY: y + 10,
    head: [['Rank', 'Player', 'Score', '-Points', 'Restored', 'Tiebreak']],
    body: rows,
    theme: 'grid',
    margin: { left: 40, right: 40 },

    styles: {
      fontSize: PDF_FONT.body,
      textColor: PDF_COLORS.textDark,
      valign: 'middle',
    },

    headStyles: {
      fillColor: [237, 233, 254], // lavender
      fontStyle: 'bold',
    },

    alternateRowStyles: {
      fillColor: [250, 250, 255],
    },

    columnStyles: {
      0: { cellWidth: 40 },  // Rank
      1: { cellWidth: 150 }, // Player
      2: { cellWidth: 60 },  // Score
      3: { cellWidth: 60 },  // Negative
      4: { cellWidth: 60 },  // Restored
      5: { cellWidth: 60 },  // TB
    },

    pageBreak: 'auto',
  });
}
