import { Toaster } from "@/components/ui/toaster";

/** Guest surface: comfortable density, single 480px column, one toast at a time. */
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="guest" className="mx-auto min-h-dvh w-full max-w-[480px] bg-bg">
      {children}
      <Toaster visibleToasts={1} />
    </div>
  );
}
