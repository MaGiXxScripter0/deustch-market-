import { describe, expect, it } from "vitest";
import { calculatePackages, filterProducts, normalizeSearch, searchProducts } from "./catalog";

describe("catalog search", () => {
  it("normalizes German diacritics", () => {
    expect(normalizeSearch("Dämmung ÖKO")).toBe("dammung oko");
  });

  it("finds products by SKU and synonym", () => {
    expect(searchProducts("NW-125-260")[0]?.sku).toBe("NW-125-260");
    expect(searchProducts("Rigips").some((product) => product.name.includes("Gipskarton"))).toBe(
      true,
    );
  });

  it("recovers from a typical typo", () => {
    expect(searchProducts("Rigpsplatte").length).toBeGreaterThan(0);
  });

  it("combines catalog filters", () => {
    const results = filterProducts({
      category: "trockenbau-platten",
      availability: "pickup",
      maxPrice: 30,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (product) =>
          product.categorySlug === "trockenbau-platten" &&
          product.inventory.pickup &&
          product.price <= 30,
      ),
    ).toBe(true);
  });
});

describe("quantity calculator", () => {
  it("rounds packages up and includes waste", () => {
    expect(calculatePackages(10, 10, 3, 24.9)).toEqual({
      target: 11,
      packages: 4,
      covered: 12,
      total: 99.6,
    });
  });

  it("handles invalid coverage safely", () => {
    expect(calculatePackages(10, 5, 0, 20).packages).toBe(0);
  });
});
