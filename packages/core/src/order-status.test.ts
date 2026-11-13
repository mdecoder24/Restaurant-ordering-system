import { expect, it } from "vitest";
import { orderStatuses } from "./order-status";

it("lists the seven state-machine statuses in lifecycle order", () => {
  expect(orderStatuses).toEqual([
    "placed",
    "accepted",
    "preparing",
    "ready",
    "served",
    "rejected",
    "cancelled",
  ]);
});
