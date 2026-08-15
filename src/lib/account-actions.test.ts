import { describe, expect, it } from "vitest";
import {
  parseAccountEmail,
  parseOrderId,
  parsePasswordChange,
  parsePickupSlot,
} from "./account-action-validation";

describe("account action validation", () => {
  it("rejects invalid email addresses", () => {
    expect(parseAccountEmail("not-an-email").success).toBe(false);
  });

  it("rejects mismatched and short passwords", () => {
    expect(
      parsePasswordChange({
        currentPassword: "password",
        newPassword: "short",
        confirmation: "short",
      }).success,
    ).toBe(false);
    expect(
      parsePasswordChange({
        currentPassword: "password",
        newPassword: "new-password",
        confirmation: "other-password",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid order IDs", () => {
    expect(parseOrderId("demo-order").success).toBe(false);
  });

  it("rejects pickup times outside the allowed window", () => {
    const now = Date.parse("2026-08-15T12:00:00.000Z");
    expect(parsePickupSlot("2026-08-15T13:59:59.999Z", now)).toBeNull();
    expect(parsePickupSlot("2026-09-15T12:00:00.001Z", now)).toBeNull();
    expect(parsePickupSlot("2026-08-15T14:00:00.000Z", now)).toBe("2026-08-15T14:00:00.000Z");
  });
});
