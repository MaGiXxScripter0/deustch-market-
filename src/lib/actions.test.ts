import { beforeEach, describe, expect, it, vi } from "vitest";
import { categoryDeletionSchema } from "./admin-category-management";
import { productSchema } from "./admin-product-validation";

const revalidatePath = vi.fn();
const updateTag = vi.fn();
const createClient = vi.fn();
const getCurrentProfile = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath, updateTag }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./supabase/server", () => ({ createClient, getCurrentProfile }));

const { saveProductAction } = await import("./actions");

const PRODUCT_ID = "20000000-0000-0000-0000-000000000002";
const CATEGORY_ID = "10000000-0000-0000-0000-000000000001";

function productFormData() {
  const formData = new FormData();
  formData.set("id", PRODUCT_ID);
  formData.set("categoryId", CATEGORY_ID);
  formData.set("sku", "00579400");
  formData.set("slug", "gipskartonplatte-feuchtraum-125");
  formData.set("brand", "Knauf");
  formData.set("name", "Diamant GKFI 12,5 mm");
  formData.set("shortDescription", "Imprägnierte Platte für Bad und Küche.");
  formData.set("description", "Feuchtebeständige Ausbauplatte für häusliche Feuchträume.");
  formData.set("price", "13.49");
  formData.set("saleUnit", "Stück");
  formData.set("basePrice", "8.65");
  formData.set("baseUnit", "m²");
  formData.set("baseQuantity", "1.56");
  formData.set("coverage", "1.56");
  formData.set("weight", "13.8");
  formData.set("imageUrl", "");
  formData.set("specs", '{"Stärke":"12,5 mm"}');
  formData.set("aliases", "GKBI, Feuchtraumplatte");
  formData.set("berlinStock", "26");
  return formData;
}

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

describe("saveProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentProfile.mockResolvedValue({ profile: { role: "admin" } });
  });

  it("reports an error when no existing product is updated", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn((table: string) => {
      if (table === "products") return { update };
      return {
        select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });
    createClient.mockResolvedValue({ from });

    const result = await saveProductAction({}, productFormData());

    expect(result).toEqual({
      error: "Das Produkt wurde nicht gefunden oder kann nicht bearbeitet werden.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("reports an error when the Nassau pickup location is missing", async () => {
    const productMaybeSingle = vi.fn().mockResolvedValue({ data: { id: PRODUCT_ID }, error: null });
    const productSelect = vi.fn(() => ({ maybeSingle: productMaybeSingle }));
    const productEq = vi.fn(() => ({ select: productSelect }));
    const productUpdate = vi.fn(() => ({ eq: productEq }));
    const from = vi.fn((table: string) => {
      if (table === "products") return { update: productUpdate };
      return {
        select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });
    createClient.mockResolvedValue({ from });

    const result = await saveProductAction({}, productFormData());

    expect(result).toEqual({ error: "Abholort Nassau wurde nicht gefunden." });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("migrates the legacy Berlin pickup location before saving inventory", async () => {
    const productMaybeSingle = vi.fn().mockResolvedValue({ data: { id: PRODUCT_ID }, error: null });
    const productSelect = vi.fn(() => ({ maybeSingle: productMaybeSingle }));
    const productEq = vi.fn(() => ({ select: productSelect }));
    const productUpdate = vi.fn(() => ({ eq: productEq }));
    const legacyLocationId = "30000000-0000-0000-0000-000000000001";
    const targetLocationQuery = {
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const legacyLocationQuery = {
      eq: vi.fn().mockResolvedValue({ data: [{ id: legacyLocationId }], error: null }),
    };
    const renamedLocation = { id: legacyLocationId, slug: "baumarkt-nassauer-land" };
    const locationMaybeSingle = vi.fn().mockResolvedValue({ data: renamedLocation, error: null });
    const locationSelectAfterUpdate = vi.fn(() => ({ maybeSingle: locationMaybeSingle }));
    const locationUpdateEq = vi.fn(() => ({ select: locationSelectAfterUpdate }));
    const locationUpdate = vi.fn(() => ({ eq: locationUpdateEq }));
    const locationSelect = vi
      .fn()
      .mockReturnValueOnce(targetLocationQuery)
      .mockReturnValueOnce(legacyLocationQuery);
    const inventoryUpsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "products") return { update: productUpdate };
      if (table === "locations") return { select: locationSelect, update: locationUpdate };
      return { upsert: inventoryUpsert };
    });
    createClient.mockResolvedValue({ from });

    const result = await saveProductAction({}, productFormData());

    expect(result).toEqual({ success: "Produkt wurde gespeichert." });
    expect(inventoryUpsert).toHaveBeenCalledWith([
      expect.objectContaining({
        product_id: PRODUCT_ID,
        location_id: legacyLocationId,
        available_qty: 26,
      }),
    ]);
  });
});
