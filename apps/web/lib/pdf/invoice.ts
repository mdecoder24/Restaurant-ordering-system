import "server-only";
import { sumOrderTotals } from "@krudex/core/bill";
import { formatInr } from "@krudex/core/format";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { pdfColors } from "./colors";

// Standard PDF fonts cannot draw "₹"; GST invoices commonly use "Rs." in print.
const money = (paise: number) => formatInr(paise).replace("₹", "Rs. ");
const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, "");

/**
 * GST tax invoice (D-06, G-11) for a session, built from stored order totals so it always
 * equals what was charged (sumOrderTotals over computeBill results). Before the table is
 * closed it prints as a provisional receipt without an invoice number.
 */
export async function renderSessionInvoice(sessionId: string): Promise<Uint8Array | null> {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("table_sessions")
    .select("id, outlet_id, token_no, opened_at, closed_at, tables(label), outlets(name, address, timezone, tenants(name, gstin))")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.outlets) return null;
  const [{ data: orders }, { data: payments }, { data: invoice }] = await Promise.all([
    admin
      .from("orders")
      .select("order_no, status, subtotal, service_charge, tax, rounding, total, order_items(name_snapshot, variant_snapshot, qty, unit_price, line_total, tax_rate_bps)")
      .eq("session_id", sessionId)
      .not("status", "in", "(rejected,cancelled)")
      .order("placed_at"),
    admin.from("payments").select("method, amount, refunded_amount, status").eq("session_id", sessionId).in("status", ["captured", "refunded"]),
    admin.from("invoices").select("invoice_no, created_at").eq("session_id", sessionId).maybeSingle(),
  ]);
  const totals = sumOrderTotals((orders ?? []).map((o) => ({ subtotal: o.subtotal, serviceCharge: o.service_charge, tax: o.tax, rounding: o.rounding, total: o.total })));
  const tz = session.outlets.timezone;
  const when = new Date(invoice?.created_at ?? session.closed_at ?? new Date().toISOString());

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 420;
  const M = 28;
  let page: PDFPage = pdf.addPage([W, 595]);
  let y = 595 - M;

  const text = (s: string, x: number, size = 9, font: PDFFont = regular, color = pdfColors.ink) => page.drawText(ascii(s), { x, y, size, font, color });
  const right = (s: string, xRight: number, size = 9, font: PDFFont = regular, color = pdfColors.ink) => {
    const t = ascii(s);
    page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color });
  };
  const line = () => {
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.6, color: pdfColors.rule });
  };
  const down = (h: number) => {
    y -= h;
    if (y < M + 40) {
      page = pdf.addPage([W, 595]);
      y = 595 - M;
    }
  };

  const tenant = session.outlets.tenants;
  text(tenant?.name ?? "", M, 14, bold, pdfColors.brand);
  right(invoice ? "TAX INVOICE" : "RECEIPT (PROVISIONAL)", W - M, 9, bold, pdfColors.muted);
  down(16);
  text(session.outlets.name, M, 9);
  down(12);
  if (session.outlets.address) {
    text(session.outlets.address.slice(0, 80), M, 8, regular, pdfColors.muted);
    down(12);
  }
  if (tenant?.gstin) {
    text(`GSTIN: ${tenant.gstin}`, M, 8, bold);
    down(12);
  }
  down(6);
  text(invoice ? `Invoice no. ${invoice.invoice_no}` : "Not a tax invoice until the bill is closed", M, 9, bold);
  right(new Intl.DateTimeFormat("en-IN", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(when), W - M, 9);
  down(12);
  text(session.tables?.label ? `Table ${session.tables.label}` : `Token ${session.token_no ?? "-"}`, M, 9, regular, pdfColors.muted);
  down(18);

  text("Item", M, 8, bold, pdfColors.muted);
  right("Qty", W - M - 150, 8, bold, pdfColors.muted);
  right("GST", W - M - 95, 8, bold, pdfColors.muted);
  right("Amount", W - M, 8, bold, pdfColors.muted);
  down(6);
  line();
  down(10);
  for (const o of orders ?? []) {
    for (const i of o.order_items) {
      const v = (i.variant_snapshot as { name?: string } | null)?.name;
      text(`${i.name_snapshot}${v ? ` (${v})` : ""}`.slice(0, 44), M, 9);
      right(String(i.qty), W - M - 150, 9);
      right(`${i.tax_rate_bps / 100}%`, W - M - 95, 9);
      right(money(i.line_total), W - M, 9);
      down(13);
    }
  }
  down(2);
  line();
  down(12);
  const row = (label: string, value: number, strong = false) => {
    text(label, W - M - 200, strong ? 11 : 9, strong ? bold : regular, strong ? pdfColors.ink : pdfColors.muted);
    right(money(value), W - M, strong ? 11 : 9, strong ? bold : regular);
    down(strong ? 16 : 13);
  };
  row("Taxable value", totals.subtotal);
  if (totals.serviceCharge) row("Service charge", totals.serviceCharge);
  row("CGST", totals.cgst);
  row("SGST", totals.sgst);
  if (totals.rounding) row("Rounding", totals.rounding);
  row("Total", totals.total, true);

  const paid = (payments ?? []).reduce((s, p) => s + p.amount - p.refunded_amount, 0);
  if (payments?.length) {
    down(4);
    for (const p of payments) {
      text(`Paid by ${p.method === "online" ? "online payment" : p.method.toUpperCase()}`, W - M - 200, 8, regular, pdfColors.muted);
      right(money(p.amount - p.refunded_amount), W - M, 8, regular, pdfColors.muted);
      down(11);
    }
    if (totals.total - paid > 0) row("Balance due", totals.total - paid, true);
  }
  down(20);
  text("Thank you! Prices include GST as shown. Intra-state supply (CGST + SGST).", M, 7, regular, pdfColors.muted);
  down(10);
  text("Generated by Krudex", M, 7, regular, pdfColors.muted);
  return pdf.save();
}
