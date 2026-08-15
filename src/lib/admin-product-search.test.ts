import { describe, expect, it } from "vitest";
import { filterAdminProducts } from "./admin-product-search";
import { products } from "./catalog-data";

const product = products.find((item) => item.sku === "00002886")!;
const otherProduct = products.find((item) => item.sku === "00579400")!;
const sampleProducts = [product, otherProduct];

describe("admin product search", () => {
  it("returns the full catalog for a blank query", () => {
    expect(filterAdminProducts("  ", sampleProducts)).toEqual(sampleProducts);
  });

  it("finds a product by SKU and excludes unrelated products", () => {
    expect(filterAdminProducts("00002886", sampleProducts)).toEqual([product]);
  });

  it("returns no products for a non-matching query", () => {
    expect(filterAdminProducts("nicht vorhanden", sampleProducts)).toEqual([]);
  });
});
