/** Kitchen surface: dark by default, large density, read from two metres. */
export default function KdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" data-density="kds" className="min-h-dvh bg-bg text-text">
      {children}
    </div>
  );
}
