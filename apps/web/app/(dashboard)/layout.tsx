import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Owner/manager surface: compact density. Shell (sidebar, top bar) lands in T05. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div data-density="dashboard" className="min-h-dvh bg-bg">
        {children}
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
