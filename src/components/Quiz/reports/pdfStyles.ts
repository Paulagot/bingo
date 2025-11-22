// src/components/Quiz/reports/pdfStyles.ts
import { jsPDF } from 'jspdf';

/**
 * Shared styles and utilities for all reconciliation PDF sections.
 * Hybrid theme with subtle lavender gradient.
 */

export const PDF_COLORS = {
  textDark: '#1F2937',        // gray-800
  textLight: '#6B7280',       // gray-500
  border: '#E5E7EB',          // gray-200
  headerText: '#374151',      // gray-700
  gradientStart: '#EDE9FE',   // subtle lavender
  gradientEnd: '#F5D0FE',     // subtle pink-lavender
};

export const PDF_FONT = {
  headerSize: 16,
  sectionTitle: 13,
  body: 10,
  small: 9,
};

/**
 * Draw subtle lavender gradient bar across width
 */
export function drawHeaderGradient(doc: jsPDF, y: number = 30) {
  // jsPDF doesn't support real gradients, but we simulate one with a rect
  // using a soft fill color. Simple but looks clean.
  doc.setFillColor(PDF_COLORS.gradientStart);
  doc.rect(0, y, doc.internal.pageSize.getWidth(), 4, 'F');
}

/**
 * Add FundRaisely header and footer to each page.
 * Should be called AFTER adding a page or before writing section content.
 */
export function addPageHeaderFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages?: number,
  generatedAt?: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ---- HEADER ----
  doc.setFontSize(PDF_FONT.headerSize);
  doc.setTextColor(PDF_COLORS.headerText);

  doc.text(
    'FundRaisely • Payment Reconciliation Report',
    40,
    22
  );

  drawHeaderGradient(doc, 28);

  // ---- FOOTER ----
  const footerY = pageHeight - 30;

  // Divider line
  doc.setDrawColor(PDF_COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(40, footerY, pageWidth - 40, footerY);

  // Footer text
  doc.setFontSize(PDF_FONT.small);
  doc.setTextColor(PDF_COLORS.textLight);

  const footerText = `Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ''}`;
  doc.text(footerText, pageWidth - 40, footerY + 14, { align: 'right' });

  if (generatedAt) {
    doc.text(
      `Generated: ${generatedAt}`,
      40,
      footerY + 14
    );
  }
}

/**
 * Utility: Insert a clean section title with spacing and lavender underline.
 */
export function addSectionTitle(
  doc: jsPDF,
  title: string,
  y: number
) {
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text(title, 40, y);

  // Underline (thin gradient-colored rule)
  doc.setDrawColor(PDF_COLORS.gradientEnd);
  doc.setLineWidth(1.2);
  doc.line(40, y + 4, 200, y + 4);
}

