import { describe, expect, it } from "vitest";
import { getPublicCategories, mapCatalogRows } from "./catalog-repository";

describe("catalog repository", () => {
  it("loads public categories without requiring the product catalog in demo mode", async () => {
    const categories = await getPublicCategories();

    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((category) => category.slug && category.name)).toBe(true);
  });

  it("keeps a product without a category in the catalog", () => {
    const catalog = mapCatalogRows(
      [
        {
          id: "10000000-0000-0000-0000-000000000001",
          slug: "platten",
          name_de: "Platten",
          description_de: "Baustoffplatten",
          sort_order: 1,
          filter_config: [],
        },
      ],
      [
        {
          id: "20000000-0000-0000-0000-000000000001",
          category_id: null,
          sku: "UNCATEGORIZED-1",
          slug: "ohne-kategorie",
          brand: "Testmarke",
          name_de: "Produkt ohne Kategorie",
          short_description_de: "Bleibt im Sortiment sichtbar.",
          description_de: "Dieses Produkt gehört zu keiner Kategorie.",
          price_gross: 12.5,
          sale_unit: "Stück",
          base_price: 12.5,
          base_unit: "Stück",
          base_quantity: 1,
          coverage_per_unit: null,
          weight_kg: 1,
          primary_image_url: null,
          specs: {},
          search_aliases: [],
          variant_group: null,
          variant_label: null,
          is_featured: false,
          is_active: true,
          inventory: [],
        },
      ],
    );

    expect(catalog.products[0]?.categorySlug).toBeNull();
  });
});
