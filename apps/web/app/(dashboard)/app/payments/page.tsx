import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody } from "@/components/dashboard/shell";
import { PaymentsTable, type PaymentRow } from "@/components/payments/payments-table";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

async function Payments({ searchParams }: PageProps<"/app/payments">) {
  const staff = await requireRole(["owner", "manager"]);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const size = 25;
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("payments")
    .select("id, method, provider, amount, refunded_amount, status, created_at, provider_payment_id, table_sessions(token_no, tables(label)), refunds(status, amount)", { count: "exact" })
    .eq("outlet_id", staff.outlet.id)
    .neq("status", "created")
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  const rows: PaymentRow[] = (data ?? []).map((p) => ({
    id: p.id,
    method: p.method,
    provider: p.provider,
    amount: p.amount,
    refunded: p.refunded_amount,
    pendingRefund: p.refunds.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0),
    status: p.status,
    createdAt: p.created_at,
    reference: p.provider_payment_id,
    where: p.table_sessions?.tables?.label ? `Table ${p.table_sessions.tables.label}` : `Token ${p.table_sessions?.token_no ?? "–"}`,
  }));
  return <PaymentsTable rows={rows} page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / size))} />;
}

export default function PaymentsPage(props: PageProps<"/app/payments">) {
  return (
    <Suspense fallback={<PageBody><Skeleton className="h-9 w-40" /><Skeleton className="h-96" /></PageBody>}>
      <Payments {...props} />
    </Suspense>
  );
}
