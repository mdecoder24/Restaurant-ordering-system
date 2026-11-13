import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";

async function Shell({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  if (staff.role === "kitchen") redirect(`/kds/${staff.outlet.id}`);
  return (
    <DashboardShell
      displayName={staff.displayName}
      email={staff.email}
      role={staff.role}
      outlet={staff.outlet}
      outlets={staff.outlets}
    >
      {children}
    </DashboardShell>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-surface-2 p-3 md:block">
        <Skeleton className="h-12 w-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <div className="p-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
