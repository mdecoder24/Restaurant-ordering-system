import { Skeleton } from "@/components/ui/skeleton";

export function MenuSkeleton() {
  return (
    <div className="px-4 pt-5" aria-busy="true" aria-label="Loading menu">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-8 w-48" />
      <Skeleton className="mt-5 h-11 w-full" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-pill" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-border py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="size-24" />
        </div>
      ))}
    </div>
  );
}
