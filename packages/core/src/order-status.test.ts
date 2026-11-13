import { describe, expect, it } from "vitest";
import { activeStatuses, checkTransition, nextStatuses, orderStatuses, statusTimestamp, terminalStatuses } from "./order-status";

it("lists the seven state-machine statuses in lifecycle order", () => {
  expect(orderStatuses).toEqual(["placed", "accepted", "preparing", "ready", "served", "rejected", "cancelled"]);
});

describe("checkTransition", () => {
  it.each([
    ["placed", "accepted", "waiter"],
    ["placed", "accepted", "system"],
    ["placed", "cancelled", "guest"],
    ["accepted", "preparing", "kitchen"],
    ["preparing", "ready", "kitchen"],
    ["preparing", "ready", "manager"],
    ["ready", "served", "waiter"],
  ] as const)("%s → %s by %s is allowed", (from, to, actor) => {
    expect(checkTransition(from, to, actor)).toEqual({ ok: true });
  });

  it("rejects transitions that do not exist", () => {
    expect(checkTransition("placed", "ready", "owner")).toEqual({ ok: false, code: "invalid_transition" });
    expect(checkTransition("served", "placed", "owner")).toEqual({ ok: false, code: "invalid_transition" });
  });

  it("rejects actors without the right role", () => {
    expect(checkTransition("placed", "accepted", "kitchen")).toEqual({ ok: false, code: "forbidden" });
    expect(checkTransition("accepted", "cancelled", "guest")).toEqual({ ok: false, code: "forbidden" });
    expect(checkTransition("ready", "served", "guest")).toEqual({ ok: false, code: "forbidden" });
  });

  it("requires a reason to reject or to cancel after acceptance", () => {
    expect(checkTransition("placed", "rejected", "manager")).toEqual({ ok: false, code: "reason_required" });
    expect(checkTransition("placed", "rejected", "manager", "  ")).toEqual({ ok: false, code: "reason_required" });
    expect(checkTransition("placed", "rejected", "manager", "Sold out")).toEqual({ ok: true });
    expect(checkTransition("accepted", "cancelled", "owner", null)).toEqual({ ok: false, code: "reason_required" });
  });
});

it("nextStatuses lists permitted moves for an actor", () => {
  expect(nextStatuses("placed", "waiter")).toEqual(["accepted", "rejected"]);
  expect(nextStatuses("placed", "guest")).toEqual(["cancelled"]);
  expect(nextStatuses("served", "owner")).toEqual([]);
});

it("partitions statuses and maps timestamps", () => {
  expect([...activeStatuses, ...terminalStatuses].sort()).toEqual([...orderStatuses].sort());
  expect(statusTimestamp.ready).toBe("ready_at");
});
