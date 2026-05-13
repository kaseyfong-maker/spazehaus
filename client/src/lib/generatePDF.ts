/*
 * SPAZEHAUS PDF GENERATOR
 * Uses jsPDF + jspdf-autotable to produce branded quotation/invoice PDFs
 * Design: Dark-branded PDF with Spazehaus identity (gold accents, clean layout)
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeTotals, formatRM } from "./quotationData";
import type { QuotationWithItems } from "./queries";

// Brand colors as RGB arrays for jsPDF
const GOLD = [201, 169, 110] as [number, number, number];        // #C9A96E
const CHARCOAL = [26, 26, 26] as [number, number, number];       // #1A1A1A
const DARK_CARD = [30, 30, 30] as [number, number, number];      // #1E1E1E
const WARM_WHITE = [245, 242, 238] as [number, number, number];  // #F5F2EE
const MUTED = [120, 115, 108] as [number, number, number];       // muted text
const LIGHT_BORDER = [50, 50, 50] as [number, number, number];   // subtle border

const COMPANY_INFO = {
  name: "SPAZEHAUS DESIGN SDN BHD",
  regNo: "202001012345 (1234567-A)",
  address: "No. 12, Jalan Molek 1/30, Taman Molek,",
  address2: "81300 Johor Bahru, Johor, Malaysia",
  phone: "+60 7-358 8899",
  email: "hello@spazehaus.com",
  website: "www.spazehaus.com",
};

export async function generateQuotationPDF(quotation: QuotationWithItems): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  const { subtotal, taxAmount, total } = computeTotals(quotation.items, quotation.taxRate);

  // ── BACKGROUND ──────────────────────────────────────────────────────────────
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 0, pageW, pageH, "F");

  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK_CARD);
  doc.rect(0, 0, pageW, 52, "F");

  // Gold accent line at top
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageW, 1.5, "F");

  // Company name (large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...GOLD);
  doc.text("SPAZEHAUS", margin, 18);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(2);
  doc.text("INTERIOR DESIGN", margin, 23);
  doc.setCharSpace(0);

  // Document type (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WARM_WHITE);
  const docTypeText = quotation.type.toUpperCase();
  const docTypeW = doc.getTextWidth(docTypeText);
  doc.text(docTypeText, pageW - margin - docTypeW, 20);

  // Doc ID
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  const docIdW = doc.getTextWidth(quotation.id);
  doc.text(quotation.id, pageW - margin - docIdW, 26);

  // Revision
  if (quotation.revision > 1) {
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const revText = `Revision ${quotation.revision}`;
    const revW = doc.getTextWidth(revText);
    doc.text(revText, pageW - margin - revW, 31);
  }

  // Company details (small, below name)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(COMPANY_INFO.address, margin, 32);
  doc.text(COMPANY_INFO.address2, margin, 36.5);
  doc.text(`${COMPANY_INFO.phone}  |  ${COMPANY_INFO.email}  |  ${COMPANY_INFO.website}`, margin, 41);
  doc.text(`Reg. No: ${COMPANY_INFO.regNo}`, margin, 45.5);

  // ── BILL TO / DATE INFO ──────────────────────────────────────────────────────
  let y = 62;

  // Two-column: Bill To (left) | Dates (right)
  const colW = contentW / 2 - 5;

  // Bill To box
  doc.setFillColor(...DARK_CARD);
  doc.roundedRect(margin, y, colW, 38, 2, 2, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(margin, y, colW, 6, 2, 2, "F");
  doc.rect(margin, y + 3, colW, 3, "F"); // flatten bottom of top bar

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...CHARCOAL);
  doc.setCharSpace(1.5);
  doc.text("BILL TO", margin + 4, y + 4.5);
  doc.setCharSpace(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WARM_WHITE);
  doc.text(quotation.client, margin + 4, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const addressLines = doc.splitTextToSize(quotation.clientAddress, colW - 8);
  doc.text(addressLines, margin + 4, y + 19);
  doc.text(quotation.clientContact, margin + 4, y + 19 + addressLines.length * 4.5);
  if (quotation.clientEmail) {
    doc.text(quotation.clientEmail, margin + 4, y + 19 + addressLines.length * 4.5 + 4.5);
  }

  // Dates box (right column)
  const rightX = margin + colW + 10;
  doc.setFillColor(...DARK_CARD);
  doc.roundedRect(rightX, y, colW, 38, 2, 2, "F");

  const dateRows = [
    { label: "Issue Date", value: quotation.issueDate },
    ...(quotation.type === "Invoice" && quotation.dueDate ? [{ label: "Due Date", value: quotation.dueDate }] : []),
    ...(quotation.type !== "Invoice" && quotation.validUntil ? [{ label: "Valid Until", value: quotation.validUntil }] : []),
    { label: "Project", value: quotation.projectName },
    { label: "Tax Rate", value: `${quotation.taxRate}%` },
  ];

  dateRows.forEach((row, i) => {
    const rowY = y + 8 + i * 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(row.label, rightX + 4, rowY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...WARM_WHITE);
    const valW = doc.getTextWidth(row.value);
    doc.text(row.value, rightX + colW - 4 - valW, rowY);
    if (i < dateRows.length - 1) {
      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.2);
      doc.line(rightX + 4, rowY + 2.5, rightX + colW - 4, rowY + 2.5);
    }
  });

  y += 46;

  // ── LINE ITEMS TABLE ─────────────────────────────────────────────────────────
  // Group items by area
  const areas = Array.from(new Set(quotation.items.map((i) => i.area || "General")));

  const tableBody: (string | { content: string; styles: object })[][] = [];

  areas.forEach((area) => {
    const areaItems = quotation.items.filter((i) => (i.area || "General") === area);

    // Area sub-header row
    tableBody.push([
      { content: area.toUpperCase(), colSpan: 6, styles: { fillColor: [40, 40, 40] as [number, number, number], textColor: GOLD, fontStyle: "bold", fontSize: 7, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, font: "helvetica" } } as any,
    ]);

    areaItems.forEach((item, idx) => {
      const lineTotal = item.qty * item.unitPrice * (1 - item.discount / 100);
      tableBody.push([
        String(tableBody.filter((r) => r.length > 1).length + 1),
        item.description || "(No description)",
        item.category,
        `${item.qty} ${item.unit}`,
        `RM ${item.unitPrice.toLocaleString("en-MY", { minimumFractionDigits: 2 })}${item.discount > 0 ? `\n(-${item.discount}%)` : ""}`,
        formatRM(lineTotal),
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Category", "Qty / Unit", "Unit Price", "Amount (RM)"]],
    body: tableBody,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      fillColor: DARK_CARD,
      textColor: WARM_WHITE,
      fontSize: 7.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineColor: LIGHT_BORDER,
      lineWidth: 0.2,
      font: "helvetica",
    },
    headStyles: {
      fillColor: [35, 35, 35] as [number, number, number],
      textColor: GOLD,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [32, 32, 32] as [number, number, number],
    },
    didParseCell: (data) => {
      // Style area header rows
      if (data.row.raw && Array.isArray(data.row.raw) && data.row.raw.length === 1) {
        data.cell.styles.fillColor = [40, 40, 40];
        data.cell.styles.textColor = GOLD;
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // ── TOTALS SECTION ───────────────────────────────────────────────────────────
  const totalsX = pageW - margin - 75;
  const totalsW = 75;
  let totalsY = finalY;

  doc.setFillColor(...DARK_CARD);
  doc.roundedRect(totalsX, totalsY, totalsW, quotation.taxRate > 0 ? 34 : 26, 2, 2, "F");

  // Subtotal row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", totalsX + 5, totalsY + 8);
  doc.setTextColor(...WARM_WHITE);
  const subW = doc.getTextWidth(formatRM(subtotal));
  doc.text(formatRM(subtotal), totalsX + totalsW - 5 - subW, totalsY + 8);

  if (quotation.taxRate > 0) {
    doc.setTextColor(...MUTED);
    doc.text(`Tax (${quotation.taxRate}%)`, totalsX + 5, totalsY + 17);
    doc.setTextColor(...WARM_WHITE);
    const taxW = doc.getTextWidth(formatRM(taxAmount));
    doc.text(formatRM(taxAmount), totalsX + totalsW - 5 - taxW, totalsY + 17);
    totalsY += 9;
  }

  // Divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(totalsX + 5, totalsY + 11, totalsX + totalsW - 5, totalsY + 11);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("TOTAL", totalsX + 5, totalsY + 20);
  const totalW = doc.getTextWidth(formatRM(total));
  doc.text(formatRM(total), totalsX + totalsW - 5 - totalW, totalsY + 20);

  // ── NOTES & TERMS ────────────────────────────────────────────────────────────
  let notesY = (doc as any).lastAutoTable.finalY + 50;
  if (notesY > pageH - 60) {
    doc.addPage();
    doc.setFillColor(...CHARCOAL);
    doc.rect(0, 0, pageW, pageH, "F");
    notesY = 20;
  }

  if (quotation.notes) {
    doc.setFillColor(...DARK_CARD);
    doc.roundedRect(margin, notesY, contentW / 2 - 5, 40, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.setCharSpace(1);
    doc.text("NOTES", margin + 4, notesY + 7);
    doc.setCharSpace(0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(quotation.notes, contentW / 2 - 15);
    doc.text(noteLines, margin + 4, notesY + 13);
  }

  if (quotation.terms) {
    const termsX = margin + contentW / 2 + 5;
    doc.setFillColor(...DARK_CARD);
    doc.roundedRect(termsX, notesY, contentW / 2 - 5, 40, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.setCharSpace(1);
    doc.text("PAYMENT TERMS", termsX + 4, notesY + 7);
    doc.setCharSpace(0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const termLines = doc.splitTextToSize(quotation.terms, contentW / 2 - 15);
    doc.text(termLines, termsX + 4, notesY + 13);
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const footerY = pageH - 12;
  doc.setFillColor(...GOLD);
  doc.rect(0, footerY - 2, pageW, 0.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${COMPANY_INFO.name}  |  ${COMPANY_INFO.email}  |  ${COMPANY_INFO.website}`, pageW / 2, footerY + 2, { align: "center" });
  doc.text(`Generated by Spazehaus Management App  |  ${new Date().toLocaleDateString("en-MY")}`, pageW / 2, footerY + 6, { align: "center" });

  // ── SAVE ─────────────────────────────────────────────────────────────────────
  const filename = `${quotation.id}_${quotation.client.replace(/[^a-zA-Z0-9]/g, "_")}_${quotation.type.replace(" ", "_")}.pdf`;
  doc.save(filename);
}
