import { describe, expect, it } from "vitest";
import { catalogImportHeaders, parseCatalogImport } from "./catalog-import";

const header = catalogImportHeaders.join(";");
const validRow =
  'SKU-1;4003982001399;Knauf;Bauplatte GKB 12,5 mm;trockenbau-platten;8,95;Stück;5,74;m²;1,56;12;true;Abholbereit in 2 Stunden;https://example.com/a.jpg;"Platte; für Wand";Beschreibung;"{""Stärke"":""12,5 mm""}";Gipsplatte|GK Platte;true;true;https://example.com/product';

describe("catalog import", () => {
  it("parses a semicolon CSV with decimal commas and quoted values", () => {
    const result = parseCatalogImport(`${header}\n${validRow}`);
    expect(result.errors).toEqual([]);
    if (result.errors.length) return;
    expect(result.rows[0]).toMatchObject({
      sku: "SKU-1",
      price: 8.95,
      stockBerlin: 12,
      pickupAvailable: true,
      aliases: ["Gipsplatte", "GK Platte"],
    });
  });

  it("rejects duplicate SKUs and invalid stock", () => {
    const invalid = validRow.replace(";12;true;", ";-1;true;");
    const result = parseCatalogImport(`${header}\n${validRow}\n${invalid}`);
    expect(result.rows).toEqual([]);
    expect(result.errors).toContain("Zeile 3: stock_berlin ist ungültig");
  });
});
