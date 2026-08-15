import { describe, expect, it } from "vitest";
import {
  calculatePackages,
  filterProducts,
  findSearchCorrection,
  normalizeSearch,
  searchProducts,
} from "./catalog";

describe("catalog search", () => {
  it("normalizes German diacritics", () => {
    expect(normalizeSearch("Dämmung ÖKO")).toBe("dammung oko");
  });

  it("finds products by SKU and synonym", () => {
    expect(searchProducts("00002886")[0]?.sku).toBe("00002886");
    expect(searchProducts("Rigips").some((product) => product.sku === "00002886")).toBe(true);
  });

  it("recovers from a typical typo", () => {
    expect(searchProducts("Rigpsplatte").length).toBeGreaterThan(0);
    expect(findSearchCorrection("Rigpsplatte")).toBe("Rigipsplatte");
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

  it("combines category-specific facets with OR inside one facet", () => {
    const results = filterProducts({
      category: "trockenbau-platten",
      specs: { Eigenschaft: ["Standard", "Feuchtraum"] },
    });

    expect(results.map((product) => product.specs.Eigenschaft).sort()).toEqual([
      "Feuchtraum",
      "Standard",
    ]);
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
