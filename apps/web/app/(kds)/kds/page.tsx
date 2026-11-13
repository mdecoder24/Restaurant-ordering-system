import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/dal";

async function Go(): Promise<never> {
  const staff = await requireStaff();
  redirect(`/kds/${staff.outlet.id}`);
}

export default function KdsIndex() {
  return (
    <Suspense>
      <Go />
    </Suspense>
  );
}
