import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody } from "@/components/dashboard/shell";
import { StaffList, type StaffRow } from "@/components/staff/staff-list";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { clientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Staff" };

async function Staff() {
  const staff = await requireRole(["owner", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, user_id, display_name, role, outlet_id, active, created_at")
    .eq("tenant_id", staff.outlet.tenantId)
    .order("created_at");
  // Emails come from auth (owners only see them); PIN users have reserved .invalid addresses.
  const admin = createAdminClient();
  const rows: StaffRow[] = await Promise.all(
    (data ?? []).map(async (m) => {
      const email = staff.role === "owner" && m.user_id ? ((await admin.auth.admin.getUserById(m.user_id)).data.user?.email ?? null) : null;
      return {
        id: m.id,
        name: m.display_name,
        role: m.role,
        outletId: m.outlet_id,
        active: m.active,
        email: email && !email.endsWith(".invalid") ? email : null,
        pinOnly: Boolean(email?.endsWith(".invalid")),
        isSelf: m.id === staff.memberId,
      };
    }),
  );
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return (
    <StaffList
      rows={rows}
      canEdit={staff.role === "owner"}
      outlets={staff.outlets.map((o) => ({ id: o.id, name: o.name }))}
      pinLinks={staff.outlets.map((o) => ({ outlet: o.name, url: `${base}/pin/${o.id}`, kds: `${base}/kds/${o.id}` }))}
    />
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<PageBody><Skeleton className="h-9 w-40" /><Skeleton className="h-80" /></PageBody>}>
      <Staff />
    </Suspense>
  );
}
