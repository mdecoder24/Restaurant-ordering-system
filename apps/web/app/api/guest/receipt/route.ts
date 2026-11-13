import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { renderSessionInvoice } from "@/lib/pdf/invoice";

/** Guest receipt download (G-11), for the session their cookie proves. */
export async function GET(request: Request) {
  const outlet = z.uuid().safeParse(new URL(request.url).searchParams.get("outlet"));
  if (!outlet.success) return fail(400, "invalid_request", "Missing outlet.");
  const sessionId = await provenSessionId(outlet.data);
  if (!sessionId) return fail(404, "not_found", "No receipt found on this phone.");
  const pdf = await renderSessionInvoice(sessionId);
  if (!pdf) return fail(404, "not_found", "No receipt found.");
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="receipt.pdf"`, "Cache-Control": "private, no-store" },
  });
}
