import { describe, expect, it } from "vitest";
import { buildCatalogHref, parseCatalogQuery } from "./catalog-query";

describe("catalog query", () => {
  it("parses repeated filters and rejects invalid numbers and sort values", () => {
    const query = parseCatalogQuery({
      q: "  platte  ",
      brand: ["Knauf", "Rigips"],
      spec: ["Stärke:12,5 mm", "Eigenschaft:Feuchtraum", "invalid"],
      minPrice: "-2",
      maxPrice: "30",
      sort: "unknown",
      page: "0",
    });

    expect(query).toEqual({
      q: "platte",
      category: undefined,
      brands: ["Knauf", "Rigips"],
      availability: undefined,
      minPrice: undefined,
      maxPrice: 30,
      specs: { Stärke: ["12,5 mm"], Eigenschaft: ["Feuchtraum"] },
      sort: "relevance",
      page: 1,
    });
  });

  it("removes q without removing active filters and resets page", () => {
    const current = new URLSearchParams(
      "q=platte&brand=Knauf&availability=pickup&sort=price-asc&page=2",
    );

    expect(buildCatalogHref("/suche", current, { q: undefined })).toBe(
      "/suche?brand=Knauf&availability=pickup&sort=price-asc",
    );
  });

  it("resets filters while preserving q", () => {
    const current = new URLSearchParams(
      "q=platte&category=trockenbau-platten&brand=Knauf&spec=St%C3%A4rke%3A12%2C5+mm&page=2",
    );

    expect(buildCatalogHref("/suche", current, { resetFilters: true })).toBe(
      "/suche?q=platte",
    );
  });
});
