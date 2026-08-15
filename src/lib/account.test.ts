import { describe, expect, it } from "vitest";
import { canCustomerManagePickup, ORDER_STATUS_LABELS, validatePickupSlot } from "./account";

describe("account domain rules", () => {
  it("contains every customer-facing order status label", () => {
    expect(Object.keys(ORDER_STATUS_LABELS)).toHaveLength(5);
    expect(ORDER_STATUS_LABELS.cancelled).toBe("Storniert");
  });

  it("only allows new pickup orders to be managed", () => {
    expect(canCustomerManagePickup("new")).toBe(true);
    expect(canCustomerManagePickup("processing")).toBe(false);
    expect(canCustomerManagePickup("ready_for_pickup")).toBe(false);
    expect(canCustomerManagePickup("completed")).toBe(false);
    expect(canCustomerManagePickup("cancelled")).toBe(false);
  });

  it("validates the two-hour and 31-day pickup boundaries", () => {
    const now = Date.parse("2026-08-15T12:00:00.000Z");
    expect(validatePickupSlot("2026-08-15T14:00:00.000Z", now)).toBe(true);
    expect(validatePickupSlot("2026-08-15T13:59:59.999Z", now)).toBe(false);
    expect(validatePickupSlot("2026-09-15T12:00:00.000Z", now)).toBe(true);
    expect(validatePickupSlot("2026-09-15T12:00:00.001Z", now)).toBe(false);
  });
});
