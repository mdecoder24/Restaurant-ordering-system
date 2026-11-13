"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

/**
 * A single indicator slides between triggers instead of each trigger fading its own
 * background, so the eye tracks one object. Until it has measured (or without JS),
 * triggers keep their own active background.
 */
export function TabsList({ className, children, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    let measured = false;
    const place = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      // Write transform/size directly on the indicator, not via inherited CSS variables.
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      indicator.style.opacity = "1";
      if (!measured) {
        measured = true;
        list.dataset.indicator = "ready";
        // Skip the slide on first placement; only user-driven changes animate.
        requestAnimationFrame(() => indicator.setAttribute("data-animate", ""));
      }
    };

    place();
    const mutations = new MutationObserver(place);
    mutations.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] });
    const resize = new ResizeObserver(place);
    resize.observe(list);
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={listRef}
      className={cn(
        "group/tabs relative isolate inline-flex items-center gap-1 rounded-md bg-surface-2 p-1",
        className,
      )}
      {...props}
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-0 -z-10 rounded-sm bg-surface opacity-0 shadow-sm",
          "data-[animate]:transition-[transform,width,height,opacity] data-[animate]:duration-[var(--motion-base)] data-[animate]:ease-[var(--ease-out)]",
        )}
      />
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "press hit-area inline-flex h-[var(--control-h-sm)] items-center gap-1.5 rounded-sm px-3 text-small font-semibold text-muted",
        "transition-[background-color,color,box-shadow,transform] duration-[var(--motion-fast)] ease-out",
        "hover-fine:text-text data-[state=active]:text-text",
        "group-data-[indicator=ready]/tabs:data-[state=active]:bg-transparent group-data-[indicator=ready]/tabs:data-[state=active]:shadow-none",
        "data-[state=active]:bg-surface data-[state=active]:shadow-sm",
        "[&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("swap-in mt-4 outline-none data-[state=inactive]:hidden", className)}
      {...props}
    />
  );
}
