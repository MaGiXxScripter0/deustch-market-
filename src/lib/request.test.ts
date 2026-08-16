import { describe, expect, it } from "vitest";
import { products } from "./catalog-data";
import {
  calculateRequestSubtotal,
  getRequestContactDefaults,
  getPickupOrderRpcFailure,
  hasUnavailableLines,
  requestSchema,
  resolveRequestLines,
} from "./request";

const validPayload = {
  name: "Anna Beispiel",
  email: "anna@example.de",
  phone: "+49 30 000000",
  pickupSlot: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  consent: true as const,
  items: [{ productId: products[0].id, quantity: 2 }],
};

describe("request validation", () => {
  it("turns a pickup inventory race into a conflict response", () => {
    expect(getPickupOrderRpcFailure("Insufficient pickup inventory")).toEqual({
      error: "Die gewünschte Menge ist aktuell nicht zur Abholung verfügbar.",
      status: 409,
      shouldLog: false,
    });
  });

  it("keeps unexpected pickup-order failures private", () => {
    expect(getPickupOrderRpcFailure("database connection failed")).toEqual({
      error: "Die Bestellung konnte nicht gespeichert werden.",
      status: 503,
      shouldLog: true,
    });
  });

  it("rejects missing consent", () => {
    expect(requestSchema.safeParse({ ...validPayload, consent: false }).success).toBe(false);
  });

  it("ignores a price supplied by the browser and recalculates from the catalog", () => {
    const parsed = requestSchema.parse({
      ...validPayload,
      items: [{ ...validPayload.items[0], price: 0.01 }],
    });
    const lines = resolveRequestLines(parsed, products);

    expect(parsed.items[0]).not.toHaveProperty("price");
    expect(calculateRequestSubtotal(lines)).toBe(products[0].price * 2);
  });

  it("rejects quantities above current location stock", () => {
    const parsed = requestSchema.parse({
      ...validPayload,
      items: [{ productId: products[0].id, quantity: products[0].inventory.berlin + 1 }],
    });

    expect(hasUnavailableLines(parsed, resolveRequestLines(parsed, products))).toBe(true);
  });

  it("rejects duplicate product lines", () => {
    const duplicate = { ...validPayload, items: [validPayload.items[0], validPayload.items[0]] };

    expect(requestSchema.safeParse(duplicate).success).toBe(false);
  });
});

describe("request contact defaults", () => {
  it("maps account contact data to checkout defaults", () => {
    expect(
      getRequestContactDefaults({
        email: "kunde@example.com",
        fullName: " Max Mustermann ",
        phone: " +49 123 456 ",
      }),
    ).toEqual({ name: "Max Mustermann", email: "kunde@example.com", phone: "+49 123 456" });
  });

  it("keeps missing account fields empty", () => {
    expect(getRequestContactDefaults({ email: null, fullName: null, phone: undefined })).toEqual({
      name: "",
      email: "",
      phone: "",
    });
  });
});
