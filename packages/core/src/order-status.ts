/** Status values exactly as in the Architecture state machine (docs/02-architecture.md §6). */
export const orderStatuses = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "served",
  "rejected",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

/** Who is asking for a transition. Staff roles mirror `member_role`; `system` is auto-accept. */
export type Actor = "guest" | "owner" | "manager" | "waiter" | "kitchen" | "system";

type Rule = { to: OrderStatus; actors: readonly Actor[]; reasonRequired?: boolean };

const floor = ["owner", "manager", "waiter"] as const;
const managers = ["owner", "manager"] as const;

/** Architecture §6. Owners and managers may also drive kitchen steps (KDS access per Flow §13). */
const rules: Record<OrderStatus, readonly Rule[]> = {
  placed: [
    { to: "accepted", actors: [...floor, "system"] },
    { to: "rejected", actors: floor, reasonRequired: true },
    { to: "cancelled", actors: ["guest", ...managers] },
  ],
  accepted: [
    { to: "preparing", actors: ["kitchen", ...managers] },
    { to: "cancelled", actors: managers, reasonRequired: true },
  ],
  preparing: [{ to: "ready", actors: ["kitchen", ...managers] }],
  ready: [{ to: "served", actors: floor }],
  served: [],
  rejected: [],
  cancelled: [],
};

export type TransitionCheck =
  | { ok: true }
  | { ok: false; code: "invalid_transition" | "forbidden" | "reason_required" };

export function checkTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: Actor,
  reason?: string | null,
): TransitionCheck {
  const rule = rules[from].find((r) => r.to === to);
  if (!rule) return { ok: false, code: "invalid_transition" };
  if (!rule.actors.includes(actor)) return { ok: false, code: "forbidden" };
  if (rule.reasonRequired && !reason?.trim()) return { ok: false, code: "reason_required" };
  return { ok: true };
}

/** Statuses an actor may move an order to from `from`, for rendering action buttons. */
export function nextStatuses(from: OrderStatus, actor: Actor): OrderStatus[] {
  return rules[from].filter((r) => r.actors.includes(actor)).map((r) => r.to);
}

export const terminalStatuses: readonly OrderStatus[] = ["served", "rejected", "cancelled"];
export const activeStatuses: readonly OrderStatus[] = ["placed", "accepted", "preparing", "ready"];

/** Timestamp column set when an order enters a status. */
export const statusTimestamp: Partial<Record<OrderStatus, "accepted_at" | "ready_at" | "served_at">> = {
  accepted: "accepted_at",
  ready: "ready_at",
  served: "served_at",
};
