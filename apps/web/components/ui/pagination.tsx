"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-2", className)}>
      <IconButton
        aria-label="Previous page"
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
      </IconButton>
      <span className="tabular min-w-20 text-center text-small text-muted" aria-live="polite">
        Page <span className="font-semibold text-text">{page}</span> of {pageCount}
      </span>
      <IconButton
        aria-label="Next page"
        variant="secondary"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight />
      </IconButton>
    </nav>
  );
}
