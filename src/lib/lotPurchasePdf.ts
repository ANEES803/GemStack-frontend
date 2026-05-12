import { jsPDF } from "jspdf";

export type LotPurchasePdfLine = {
  item: string;
  description: string;
  qtyUom: string;
  rate: string;
  amount: string;
};

export type LotPurchasePdfData = {
  lotCode: string;
  dateDisplay: string;
  reference: string;
  supplier: string;
  supplierEmail: string;
  paymentTerms: string;
  status: string;
  memo: string;
  lines: LotPurchasePdfLine[];
  subtotalDisplay: string;
  totalDisplay: string;
  paidDisplay: string;
  balanceDisplay: string;
};

const MARGIN = 16;

function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const w = words[i]!;
    const test = `${cur} ${w}`;
    if (doc.getTextWidth(test) <= maxWidth) cur = test;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  lines.push(cur);
  return lines;
}

function pageBottom(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - MARGIN;
}

/**
 * Build a purchase-lot document PDF (supplier receipt / lot invoice) and trigger download.
 */
export function downloadLotPurchasePdf(data: LotPurchasePdfData): void {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const maxTextW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageBottom(doc)) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const addParagraph = (text: string, size = 10, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style === "bold" ? "bold" : style === "italic" ? "italic" : "normal");
    const lines = splitLines(doc, text, maxTextW);
    for (const line of lines) {
      ensureSpace(size * 0.45 + 2);
      doc.text(line, MARGIN, y);
      y += size * 0.42 + 1.2;
    }
  };

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GemStack Trading Co.", MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Purchase lot · receipt / invoice", MARGIN, y);
  y += 6;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const rightTitle = "LOT DOCUMENT";
  doc.text(rightTitle, pageW - MARGIN - doc.getTextWidth(rightTitle), MARGIN + 4);
  y = Math.max(y, MARGIN + 14);

  addParagraph(`Lot ID: ${data.lotCode}`, 11, "bold");
  addParagraph(`Date: ${data.dateDisplay}`, 10);
  addParagraph(`Reference: ${data.reference || "—"}`, 10);
  addParagraph(`Payment terms: ${data.paymentTerms || "—"}`, 10);
  addParagraph(`Status: ${data.status}`, 10);
  y += 2;

  addParagraph("Supplier", 11, "bold");
  addParagraph(data.supplier || "—", 10);
  if (data.supplierEmail.trim()) addParagraph(`Email: ${data.supplierEmail}`, 9);
  y += 3;

  doc.setDrawColor(200);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 6;

  const colItem = MARGIN;
  const colDesc = MARGIN + 28;
  const colQty = pageW - MARGIN - 48;
  const colRate = pageW - MARGIN - 26;
  const colAmt = pageW - MARGIN - 2;
  const itemWidth = colDesc - colItem - 3;
  const descWidth = colQty - colDesc - 4;
  const qtyWidth = colRate - colQty - 3;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  ensureSpace(8);
  doc.text("Item", colItem, y);
  doc.text("Description", colDesc, y);
  doc.text("Qty", colQty, y, { align: "right" });
  doc.text("Rate", colRate, y, { align: "right" });
  doc.text("Amount", colAmt, y, { align: "right" });
  y += 5;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const row of data.lines) {
    const itemLines = splitLines(doc, row.item, itemWidth);
    const descLines = splitLines(doc, row.description, descWidth);
    const qtyLines = splitLines(doc, row.qtyUom, qtyWidth);
    const n = Math.max(itemLines.length, descLines.length, qtyLines.length, 1);
    const lineH = 3.6;
    const rowH = n * lineH + 2;
    ensureSpace(rowH);

    for (let i = 0; i < itemLines.length; i++) {
      doc.text(itemLines[i]!, colItem, y + (i + 1) * lineH);
    }
    for (let i = 0; i < descLines.length; i++) {
      doc.text(descLines[i]!, colDesc, y + (i + 1) * lineH);
    }
    for (let i = 0; i < qtyLines.length; i++) {
      doc.text(qtyLines[i]!, colQty + qtyWidth, y + (i + 1) * lineH, { align: "right" });
    }
    doc.text(row.rate, colRate, y + lineH, { align: "right" });
    doc.text(row.amount, colAmt, y + lineH, { align: "right" });
    y += rowH;
  }

  y += 4;
  doc.setDrawColor(200);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const labelX = pageW - MARGIN - 55;
  const valX = pageW - MARGIN;
  const rowPair = (label: string, value: string, bold = false) => {
    ensureSpace(6);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, y);
    doc.text(value, valX, y, { align: "right" });
    y += 5;
  };
  rowPair("Subtotal", data.subtotalDisplay);
  rowPair("Total", data.totalDisplay, true);
  rowPair("Paid", data.paidDisplay);
  rowPair("Balance", data.balanceDisplay);
  doc.setFont("helvetica", "normal");

  y += 4;
  if (data.memo.trim()) {
    addParagraph("Notes", 10, "bold");
    addParagraph(data.memo, 9);
  }

  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(90, 90, 90);
  addParagraph("Thank you for your business.", 8, "italic");
  doc.setTextColor(0, 0, 0);

  const safe = data.lotCode.replace(/[^\w.-]+/g, "_") || "lot";
  doc.save(`Lot-${safe}.pdf`);
}
