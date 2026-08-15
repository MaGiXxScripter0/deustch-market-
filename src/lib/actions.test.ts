import { describe, expect, it } from "vitest";
import { categoryDeletionSchema } from "./admin-category-management";
import { productSchema } from "./admin-product-validation";

describe("admin product validation", () => {
  it("accepts the seeded catalog identifiers", () => {
    const result = productSchema.shape.categoryId.safeParse("10000000-0000-0000-0000-000000000001");
    const productId = productSchema.shape.id.safeParse("20000000-0000-0000-0000-000000000002");

    expect(result.success).toBe(true);
    expect(productId.success).toBe(true);
  });

  it("accepts an empty category for uncategorized products", () => {
    expect(productSchema.shape.categoryId.safeParse("").success).toBe(true);
  });

  it("requires a category identifier and confirmation before deletion", () => {
    expect(
      categoryDeletionSchema.safeParse({
        id: "10000000-0000-0000-0000-000000000001",
        confirmation: "",
      }).success,
    ).toBe(false);
    expect(
      categoryDeletionSchema.safeParse({
        id: "10000000-0000-0000-0000-000000000001",
        confirmation: "Dämmung & Folien",
      }).success,
    ).toBe(true);
  });
});
