"use client";

import { Check, ChevronsUpDown, LogOut, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { signOut, switchOutlet } from "@/lib/auth/actions";
import type { OutletMode, Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/initials";
import { kitchenNav, visibleNav } from "./nav";

export type ShellProps = {
  displayName: string;
  email: string | null;
  role: Role;
  outlet: { id: string; name: string; mode: OutletMode; tenantName: string };
  outlets: { id: string; name: string; tenantName: string }[];
  children: ReactNode;
};

const roleLabel: Record<Role, string> = { owner: "Owner", manager: "Manager", waiter: "Floor staff", kitchen: "Kitchen" };

function NavLinks({ role, outlet, onNavigate }: Pick<ShellProps, "role" | "outlet"> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = visibleNav(role, outlet.mode);
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-3 rounded-md px-3 text-small font-medium",
              "transition-[background-color,color] duration-[var(--motion-fast)] ease-out",
              active ? "bg-surface text-text shadow-sm" : "text-muted hover-fine:bg-surface hover-fine:text-text",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-2 bottom-2 left-0 w-0.5 rounded-pill bg-primary transition-[opacity,transform] duration-[var(--motion-base)] ease-out",
                active ? "scale-y-100 opacity-100" : "scale-y-50 opacity-0",
              )}
            />
            <item.icon className={cn("size-[18px]", active && "text-primary")} aria-hidden strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
      {role !== "waiter" ? (
        <a
          href={`/kds/${outlet.id}`}
          target="_blank"
          rel="noopener"
          onClick={onNavigate}
          className="mt-3 flex h-9 items-center gap-3 rounded-md border border-dashed border-border-strong px-3 text-small font-medium text-muted transition-colors duration-[var(--motion-fast)] hover-fine:border-primary hover-fine:text-primary"
        >
          <kitchenNav.icon className="size-[18px]" aria-hidden />
          {kitchenNav.label}
        </a>
      ) : null}
    </nav>
  );
}

function OutletSwitcher({ outlet, outlets }: Pick<ShellProps, "outlet" | "outlets">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="press flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors duration-[var(--motion-fast)] hover-fine:bg-surface"
        >
          <LogoMark className="size-8 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-semibold">{outlet.tenantName}</span>
            <span className="block truncate text-caption text-muted">{outlet.name}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Outlets</DropdownMenuLabel>
        {outlets.map((o) => (
          <form key={o.id} action={switchOutlet}>
            <input type="hidden" name="outletId" value={o.id} />
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <span className="min-w-0 flex-1 truncate text-left">{o.name}</span>
                {o.id === outlet.id ? <Check className="size-4 text-primary" aria-hidden /> : null}
              </button>
            </DropdownMenuItem>
          </form>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Account({ displayName, email, role }: Pick<ShellProps, "displayName" | "email" | "role">) {
  const avatar = initials(displayName);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="press flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors duration-[var(--motion-fast)] hover-fine:bg-surface"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-caption font-bold text-primary">
            {avatar}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-semibold">{displayName}</span>
            <span className="block truncate text-caption text-muted">{roleLabel[role]}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        {email && !email.endsWith(".invalid") ? <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel> : null}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell(props: ShellProps) {
  const [open, setOpen] = useState(false);
  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-4 p-3">
      <OutletSwitcher outlet={props.outlet} outlets={props.outlets} />
      <div className="flex-1 overflow-y-auto">
        <NavLinks role={props.role} outlet={props.outlet} onNavigate={onNavigate} />
      </div>
      <Account displayName={props.displayName} email={props.email} role={props.role} />
    </div>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface-2 md:block">{sidebar()}</aside>
      <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur-md md:hidden">
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title="Menu"
          hideHeader
          trigger={
            <IconButton aria-label="Open navigation">
              <MenuIcon aria-hidden />
            </IconButton>
          }
        >
          {sidebar(() => setOpen(false))}
        </Sheet>
        <span className="truncate text-small font-semibold">{props.outlet.name}</span>
      </header>
      <div className="min-w-0">{props.children}</div>
    </div>
  );
}

/** Standard page header: title, optional description and actions. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-h1 font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-body text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8", className)}>{children}</main>;
}
