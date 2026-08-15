import { describe, expect, it } from "vitest";
import { searchCatalog } from "./catalog-search";

describe("catalog search repository", () => {
  it("uses the demo fallback with the same filtered and paginated result contract", async () => {
    const result = await searchCatalog({
      q: "platte",
      brands: ["Knauf"],
      specs: {},
      sort: "price-asc",
      page: 1,
    });

    expect(result.source).toBe("demo");
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((item) => item.brand === "Knauf")).toBe(true);
    expect(result.items).toHaveLength(result.total);
    expect(result.pageSize).toBe(24);
    expect(result.facets.categories.some((category) => category.slug === "trockenbau-platten")).toBe(
      true,
    );
  });

  it("scopes fallback results to a route category and calculates an empty out-of-range page", async () => {
    const scoped = await searchCatalog(
      { q: "", brands: [], specs: {}, sort: "featured", page: 1 },
      "trockenbau-platten",
    );
    const outOfRange = await searchCatalog({
      q: "",
      brands: [],
      specs: {},
      sort: "featured",
      page: 2,
    });

    expect(scoped.items.every((item) => item.categorySlug === "trockenbau-platten")).toBe(true);
    expect(outOfRange.total).toBeGreaterThan(0);
    expect(outOfRange.items).toEqual([]);
    expect(outOfRange.hasPreviousPage).toBe(true);
    expect(outOfRange.hasNextPage).toBe(false);
  });
});
