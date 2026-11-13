import { CircleAlert } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="swap-in flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2.5 text-small text-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
