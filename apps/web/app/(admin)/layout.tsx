/** Platform admin surface (T20). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="dashboard" className="min-h-dvh bg-bg">
      {children}
    </div>
  );
}
