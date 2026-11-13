import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { NextResponse } from "next/server";
import { z } from "zod";
import { staffForApi } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { pdfColors } from "@/lib/pdf/colors";
import { qrPng } from "@/lib/tables/qr";

const mm = (v: number) => (v * 72) / 25.4;
const { ink, muted, brand: brandColour } = pdfColors;

/**
 * Print-ready A6 table tents, one per page (Design System §8): outlet, table label, QR at
 * 50 mm (spec minimum 35 mm), one line of instruction. ?ids= limits to some tables;
 * ?counter=1 prints the canteen counter code.
 */
export async function GET(request: Request) {
  const staff = await staffForApi(["owner", "manager", "waiter"]);
  if (!staff) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in first." } }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const ids = z.array(z.uuid()).max(200).safeParse(params.get("ids")?.split(",").filter(Boolean) ?? []);
  if (!ids.success) return NextResponse.json({ error: { code: "invalid_request", message: "Bad table ids." } }, { status: 400 });

  const supabase = await createClient();
  const cards: { label: string; token: string }[] = [];
  if (params.get("counter") === "1") {
    const { data } = await supabase.from("outlets").select("counter_qr_token").eq("id", staff.outlet.id).single();
    if (data?.counter_qr_token) cards.push({ label: "Order here", token: data.counter_qr_token });
  } else {
    let q = supabase.from("tables").select("label, qr_token").eq("outlet_id", staff.outlet.id).eq("active", true).order("label");
    if (ids.data.length) q = q.in("id", ids.data);
    const { data } = await q;
    for (const t of data ?? []) cards.push({ label: t.label, token: t.qr_token });
  }
  if (cards.length === 0) return NextResponse.json({ error: { code: "not_found", message: "No tables to print." } }, { status: 404 });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${staff.outlet.name} QR codes`);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const [w, h] = [mm(105), mm(148)];
  // Standard PDF fonts are WinAnsi only; strip anything they cannot encode.
  const centre = (page: PDFPage, text: string, size: number, y: number, font: PDFFont = regular, color = ink) => {
    const safe = text.replace(/[^\x20-\x7E]/g, "");
    page.drawText(safe, { x: (w - font.widthOfTextAtSize(safe, size)) / 2, y, size, font, color });
  };

  for (const card of cards) {
    const page = pdf.addPage([w, h]);
    centre(page, staff.outlet.tenantName, 11, h - mm(16), bold, brandColour);
    centre(page, staff.outlet.name, 9, h - mm(21), regular, muted);
    const label = card.label.length > 14 ? card.label.slice(0, 14) : card.label;
    centre(page, params.get("counter") === "1" ? label : `Table ${label}`, 26, h - mm(36), bold);
    const png = await pdf.embedPng(await qrPng(card.token, 900));
    const size = mm(50);
    page.drawImage(png, { x: (w - size) / 2, y: h - mm(36) - mm(8) - size, width: size, height: size });
    centre(page, "Scan to see the menu, order and pay", 10, mm(30), bold);
    centre(page, "No app needed. Just your phone camera.", 8, mm(24), regular, muted);
    centre(page, "Krudex", 7, mm(10), regular, muted);
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-codes.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
