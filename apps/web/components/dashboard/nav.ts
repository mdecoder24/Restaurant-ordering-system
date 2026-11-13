import {
  BarChart3,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Store,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { OutletMode, Role } from "@/lib/auth/dal";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles: readonly Role[]; mode?: OutletMode };

/** Screen-level permissions from Application Flow §13. The server enforces the same rules. */
export const navItems: NavItem[] = [
  { href: "/app", label: "Home", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { href: "/app/orders", label: "Orders", icon: ClipboardList, roles: ["owner", "manager", "waiter"] },
  { href: "/app/canteen", label: "Canteen", icon: Store, roles: ["owner", "manager", "waiter"], mode: "canteen" },
  { href: "/app/tables", label: "Tables", icon: LayoutGrid, roles: ["owner", "manager", "waiter"], mode: "dine_in" },
  { href: "/app/menu", label: "Menu", icon: UtensilsCrossed, roles: ["owner", "manager", "waiter"] },
  { href: "/app/payments", label: "Payments", icon: CreditCard, roles: ["owner", "manager"] },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/app/staff", label: "Staff", icon: UsersRound, roles: ["owner", "manager"] },
  { href: "/app/settings", label: "Settings", icon: Settings, roles: ["owner", "manager"] },
];

export const kitchenNav = { label: "Kitchen screen", icon: ChefHat };

export function visibleNav(role: Role, mode: OutletMode) {
  return navItems.filter((i) => i.roles.includes(role) && (!i.mode || i.mode === mode));
}
