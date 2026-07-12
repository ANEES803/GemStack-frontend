import { jsPDF } from "jspdf";

import { emitAppToast } from "@/components/providers/AppNotificationsProvider";

export type InvoicePrintSettings = {
  paperSize: "a4" | "letter" | "legal";
  orientation: "portrait" | "landscape";
  includeCompanyHeader: boolean;
  includeParcelAndLinks: boolean;
  includeCustomerNotes: boolean;
  includePaymentFooter: boolean;
  /** Wider inner margin (mm) for readability */
  marginPreset: "normal" | "narrow" | "wide";
};

export const DEFAULT_INVOICE_PRINT_SETTINGS: InvoicePrintSettings = {
  paperSize: "a4",
  orientation: "portrait",
  includeCompanyHeader: true,
  includeParcelAndLinks: true,
  includeCustomerNotes: true,
  includePaymentFooter: true,
  marginPreset: "normal",
};

export type InvoicePdfData = {
  invoiceNo: string;
  dateIso: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  customerDetail: string;
  holder: string;
  paymentMethod: string;
  amountDisplay: string;
  status: string;
  parcelNo: string;
  fbInvoiceLink: string;
};

const MARGIN: Record<InvoicePrintSettings["marginPreset"], number> = {
  narrow: 12,
  normal: 16,
  wide: 22,
};

const FORMAT: Record<InvoicePrintSettings["paperSize"], "a4" | "letter" | "legal"> = {
  a4: "a4",
  letter: "letter",
  legal: "legal",
};

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

export function downloadInvoicePdf(data: InvoicePdfData, settings: InvoicePrintSettings): void {
  const margin = MARGIN[settings.marginPreset];
  const orient = settings.orientation === "portrait" ? "p" : "l";
  const doc = new jsPDF({ orientation: orient, unit: "mm", format: FORMAT[settings.paperSize] });
  const pageW = doc.internal.pageSize.getWidth();
  const maxTextW = pageW - margin * 2;
  let y = margin;

  const addLines = (text: string, size = 10, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFontSize(size);
    const fontStyle = style === "bold" ? "bold" : style === "italic" ? "italic" : "normal";
    doc.setFont("helvetica", fontStyle);
    const lines = splitLines(doc, text, maxTextW);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 0.42 + 1.2;
    }
  };

  if (settings.includeCompanyHeader) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GemStack Trading Co.", margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Gemstone ERP · Sales invoice", margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageW - margin - doc.getTextWidth("INVOICE"), margin + 4);
  y = Math.max(y, margin + 14);

  addLines(`Invoice #: ${data.invoiceNo}`, 11, "bold");
  addLines(`Date: ${data.dateIso}`, 10);
  addLines(`Status: ${data.status}`, 10);
  y += 2;

  addLines("Bill to", 11, "bold");
  addLines(data.customer || "—", 10);
  if (data.customerEmail) addLines(`Email: ${data.customerEmail}`, 9);
  if (data.customerPhone) addLines(`Phone: ${data.customerPhone}`, 9);
  if (settings.includeCustomerNotes && data.customerDetail.trim()) {
    addLines(`Notes: ${data.customerDetail}`, 9, "italic");
  }
  y += 2;

  addLines(`FEP / Holder: ${data.holder || "—"}`, 10);
  addLines(`Payment method: ${data.paymentMethod}`, 10);
  if (settings.includeParcelAndLinks) {
    addLines(`Parcel: ${data.parcelNo || "—"}`, 10);
    if (data.fbInvoiceLink.trim()) addLines(`FB invoice link: ${data.fbInvoiceLink}`, 8);
  }
  y += 4;

  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Amount due", margin, y);
  doc.setFontSize(14);
  doc.text(data.amountDisplay || "$0.00", pageW - margin - doc.getTextWidth(data.amountDisplay || "$0.00"), y);
  y += 12;

  if (settings.includePaymentFooter) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(90, 90, 90);
    addLines("Thank you for your business. Please remit payment per the method above. Questions: accounts@gemstack.demo", 8, "italic");
    doc.setTextColor(0, 0, 0);
  }

  const safeName = data.invoiceNo.replace(/[^\w.-]+/g, "_") || "invoice";
  doc.save(`Invoice-${safeName}.pdf`);
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openInvoicePrintPreview(data: InvoicePdfData, settings: InvoicePrintSettings): void {
  const margin = settings.marginPreset === "narrow" ? "12mm" : settings.marginPreset === "wide" ? "22mm" : "16mm";
  const size =
    settings.paperSize === "a4"
      ? "A4"
      : settings.paperSize === "legal"
        ? "legal"
        : "letter";
  const orient = settings.orientation === "landscape" ? "landscape" : "portrait";

  const rows: string[] = [];
  rows.push(`<tr><td colspan="2" class="label">Invoice #</td><td class="val">${escHtml(data.invoiceNo)}</td></tr>`);
  rows.push(`<tr><td colspan="2" class="label">Date</td><td class="val">${escHtml(data.dateIso)}</td></tr>`);
  rows.push(`<tr><td colspan="2" class="label">Status</td><td class="val">${escHtml(data.status)}</td></tr>`);
  rows.push(`<tr><td colspan="2" class="label">Customer</td><td class="val">${escHtml(data.customer || "—")}</td></tr>`);
  if (data.customerEmail) rows.push(`<tr><td colspan="2" class="label">Email</td><td class="val">${escHtml(data.customerEmail)}</td></tr>`);
  if (data.customerPhone) rows.push(`<tr><td colspan="2" class="label">Phone</td><td class="val">${escHtml(data.customerPhone)}</td></tr>`);
  if (settings.includeCustomerNotes && data.customerDetail.trim()) {
    rows.push(`<tr><td colspan="2" class="label">Notes</td><td class="val">${escHtml(data.customerDetail)}</td></tr>`);
  }
  rows.push(`<tr><td colspan="2" class="label">FEP / Holder</td><td class="val">${escHtml(data.holder || "—")}</td></tr>`);
  rows.push(`<tr><td colspan="2" class="label">Payment</td><td class="val">${escHtml(data.paymentMethod)}</td></tr>`);
  if (settings.includeParcelAndLinks) {
    rows.push(`<tr><td colspan="2" class="label">Parcel</td><td class="val">${escHtml(data.parcelNo || "—")}</td></tr>`);
    if (data.fbInvoiceLink.trim()) {
      rows.push(`<tr><td colspan="2" class="label">FB link</td><td class="val wrap">${escHtml(data.fbInvoiceLink)}</td></tr>`);
    }
  }
  rows.push(
    `<tr class="amt"><td colspan="2" class="label">Amount</td><td class="val strong">${escHtml(data.amountDisplay || "$0.00")}</td></tr>`,
  );

  const headerBlock = settings.includeCompanyHeader
    ? `<div class="co"><div class="coname">GemStack Trading Co.</div><div class="cosub">Gemstone ERP · Sales invoice</div></div>`
    : `<div class="co"><div class="coname">Invoice</div></div>`;

  const footerBlock = settings.includePaymentFooter
    ? `<p class="foot">Thank you for your business. Use your browser’s print dialog for copies, color, duplex, and printer selection.</p>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${escHtml(data.invoiceNo)}</title>
<style>
  @page { size: ${size} ${orient}; margin: ${margin}; }
  body { font-family: system-ui, Segoe UI, Roboto, sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.4; }
  .co { margin-bottom: 1.2rem; border-bottom: 2px solid #f97316; padding-bottom: 0.5rem; }
  .coname { font-size: 18pt; font-weight: 800; }
  .cosub { font-size: 9pt; color: #64748b; margin-top: 0.25rem; }
  h1 { font-size: 14pt; margin: 0 0 0.75rem 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.35rem 0; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
  .label { color: #64748b; width: 28%; font-weight: 600; }
  .val { color: #0f172a; }
  .wrap { word-break: break-all; }
  tr.amt td { border-bottom: none; padding-top: 1rem; font-size: 13pt; }
  .strong { font-weight: 800; }
  .foot { margin-top: 1.5rem; font-size: 8pt; color: #64748b; font-style: italic; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
${headerBlock}
<h1>Invoice details</h1>
<table>${rows.join("")}</table>
${footerBlock}
<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    emitAppToast("Pop-up blocked. Allow pop-ups to use the print preview.", "error");
    return;
  }
  w.document.write(html);
  w.document.close();
}
