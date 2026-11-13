"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";

/**
 * Minimal drag-to-reorder for short lists (Design System: MenuEditor). Native HTML5 drag
 * for pointers, Alt+Arrow keys for keyboards. Commits once on drop, not on every hover.
 */
export function useSortable<T extends { id: string }>(items: T[], onCommit: (ids: string[]) => void) {
  // A local order is kept until the server sends a new list, so a committed move never
  // snaps back while the save is in flight.
  const serverKey = items.map((i) => i.id).join();
  const [local, setLocal] = useState<{ key: string; ids: string[] } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const order = local && local.key === serverKey ? local.ids : null;
  const ids = order ?? items.map((i) => i.id);
  const setOrder = (next: string[]) => setLocal({ key: serverKey, ids: next });
  const byId = new Map(items.map((i) => [i.id, i]));
  const sorted = ids.map((id) => byId.get(id)).filter((i): i is T => Boolean(i));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return ids;
    const next = [...ids];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m!);
    setOrder(next);
    return next;
  };

  const rowProps = (id: string) => ({
    draggable: true,
    "data-dragging": dragging === id || undefined,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      setDragging(id);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (!dragging || dragging === id) return;
      move(ids.indexOf(dragging), ids.indexOf(id));
    },
    onDragEnd: () => {
      setDragging(null);
      if (order && order.join() !== serverKey) onCommit(order);
    },
  });

  const handleProps = (id: string, label: string) => ({
    "aria-label": `Reorder ${label}. Alt plus arrow keys to move.`,
    onKeyDown: (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      const i = ids.indexOf(id);
      const next = move(i, e.key === "ArrowUp" ? i - 1 : i + 1);
      if (next !== ids) onCommit(next);
    },
  });

  return { sorted, rowProps, handleProps };
}
