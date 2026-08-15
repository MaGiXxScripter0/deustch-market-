import { describe, expect, it } from "vitest";
import { orderTrackingSchema, trackedOrderSchema } from "./order-tracking";

describe("guest order tracking", () => {
  it("normalizes a valid order number and handover code", () => {
    expect(orderTrackingSchema.parse({ requestNumber: "abh-2026-000123", pickupCode: "ab12cd" })).toEqual({
      requestNumber: "ABH-2026-000123",
      pickupCode: "AB12CD",
    });
  });

  it("does not accept a tracking response with an unknown status", () => {
    expect(
      trackedOrderSchema.safeParse({
        requestNumber: "ABH-2026-000123",
        pickupCode: "AB12CD",
        pickupSlot: null,
        subtotal: 10,
        status: "quoted",
        items: [],
      }).success,
    ).toBe(false);
  });
});
