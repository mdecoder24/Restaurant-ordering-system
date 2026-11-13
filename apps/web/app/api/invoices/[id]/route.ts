import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api/respond";
import { staffForApi } from "@/lib/auth/dal";
import { renderSessionInvoice } from "@/lib/pdf/invoice";
import { createClient } from "@/lib/supabase/server";

/** GST invoice PDF for staff (RLS: owner, manager, floor staff of that outlet). */
export async function GET(_: Request, { params }: RouteContext<"/api/invoices/[id]">) {
  const staff = await staffForApi(["owner", "manager", "waiter"]);
  if (!staff) return fail(401, "unauthorized", "Sign in again.");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found", "Invoice not found.");
  const { data: inv } = await (await createClient()).from("invoices").select("session_id, invoice_no").eq("id", id).maybeSingle();
  if (!inv) return fail(404, "not_found", "Invoice not found.");
  const pdf = await renderSessionInvoice(inv.session_id);
  if (!pdf) return fail(404, "not_found", "Invoice not found.");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${inv.invoice_no.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
