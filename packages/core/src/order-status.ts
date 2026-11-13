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
