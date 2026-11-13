import { QrCode } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Code not active" };

export default function InvalidQrPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <EmptyState icon={QrCode} title="This QR code isn’t active" description="It may have been replaced. Ask staff for a new code." />
    </main>
  );
}
