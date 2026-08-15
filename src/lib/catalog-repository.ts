import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { categories as fallbackCategories, products as fallbackProducts } from "./catalog-data";
import { createClient, createPublicClient, hasSupabaseConfig } from "./supabase/server";
import { siteConfig } from "./site-config";
import type { Database } from "./supabase/database.types";
import type { Category, Product } from "./types";

type DatabaseCategory = {
  id: string;
  slug: string;
  name_de: string;
  description_de: string;
  sort_order: number;
  filter_config: unknown;
};

type DatabaseInventory = {
  available_qty: number | string;
  pickup_available: boolean;
  lead_time_de: string;
  locations: { slug?: string } | Array<{ slug?: string }> | null;
};

type DatabaseProduct = {
  id: string;
  category_id: string | null;
  sku: string;
  slug: string;
  brand: string;
  name_de: string;
  short_description_de: string;
  description_de: string;
  price_gross: number | string;
  sale_unit: string;
  base_price: number | string;
  base_unit: string;
  base_quantity: number | string;
  coverage_per_unit: number | string | null;
  weight_kg: number | string;
  primary_image_url: string | null;
  specs: Record<string, string | number | boolean> | null;
  search_aliases: string[] | null;
  variant_group: string | null;
  variant_label: string | null;
  is_featured: boolean;
  is_active: boolean;
  inventory: DatabaseInventory[] | null;
};

export type CatalogData = {
  categories: Category[];
  products: Product[];
  source: "supabase" | "demo";
};

function locationSlug(inventory: DatabaseInventory) {
  if (Array.isArray(inventory.locations)) return inventory.locations[0]?.slug;
  return inventory.locations?.slug;
}

async function readCatalog(): Promise<CatalogData> {
  const supabase = createPublicClient();
  if (!supabase)
    return { categories: fallbackCategories, products: fallbackProducts, source: "demo" };

  return queryCatalog(supabase);
}

async function readPublicCategories(): Promise<Category[]> {
  const supabase = createPublicClient();
  if (!supabase) return fallbackCategories;

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_de, description_de, sort_order, filter_config")
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data?.length) return fallbackCategories;
  return mapCatalogRows(data as DatabaseCategory[], []).categories;
}

async function queryCatalog(supabase: SupabaseClient<Database>): Promise<CatalogData> {
  const [categoryResult, productResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name_de, description_de, sort_order, filter_config")
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, category_id, sku, slug, brand, name_de, short_description_de, description_de, price_gross, sale_unit, base_price, base_unit, base_quantity, coverage_per_unit, weight_kg, primary_image_url, specs, search_aliases, variant_group, variant_label, is_featured, is_active, inventory(available_qty, pickup_available, lead_time_de, locations(slug))",
      )
      .order("is_featured", { ascending: false }),
  ]);

  if (categoryResult.error || productResult.error || !productResult.data?.length) {
    return { categories: fallbackCategories, products: fallbackProducts, source: "demo" };
  }

  const { categories, products } = mapCatalogRows(
    (categoryResult.data ?? []) as DatabaseCategory[],
    productResult.data as unknown as DatabaseProduct[],
  );

  return { categories, products, source: "supabase" };
}

export function mapCatalogRows(rows: DatabaseCategory[], productRows: DatabaseProduct[]) {
  const categories: Category[] = rows.map((category, index) => ({
    id: category.id,
    slug: category.slug,
    name: category.name_de,
    shortName: category.name_de.split(" & ")[0],
    description: category.description_de,
    number: String(category.sort_order || index + 1).padStart(2, "0"),
    filterKeys: Array.isArray(category.filter_config)
      ? category.filter_config.filter((value): value is string => typeof value === "string")
      : [],
  }));
  const categoryById = new Map(categories.map((category) => [category.id, category.slug]));
  const products: Product[] = productRows.map((product) => {
    const inventory = product.inventory ?? [];
    const berlin = inventory.find((item) => locationSlug(item) === siteConfig.pickupLocationSlug);
    const image =
      product.primary_image_url ??
      fallbackProducts.find((item) => item.id === product.id)?.image ??
      "/og.png";

    return {
      id: product.id,
      slug: product.slug,
      categorySlug: product.category_id ? (categoryById.get(product.category_id) ?? null) : null,
      sku: product.sku,
      brand: product.brand,
      name: product.name_de,
      shortDescription: product.short_description_de,
      description: product.description_de,
      price: Number(product.price_gross),
      saleUnit: product.sale_unit,
      basePrice: Number(product.base_price),
      baseUnit: product.base_unit,
      baseQuantity: Number(product.base_quantity),
      coveragePerUnit: product.coverage_per_unit ? Number(product.coverage_per_unit) : undefined,
      weightKg: Number(product.weight_kg),
      image,
      imageAlt: `${product.name_de} – Produktabbildung`,
      featured: product.is_featured,
      active: product.is_active,
      aliases: product.search_aliases ?? [],
      specs: product.specs ?? {},
      inventory: {
        berlin: Number(berlin?.available_qty ?? 0),
        pickup: Boolean(berlin?.pickup_available),
        pickupLeadTime: berlin?.lead_time_de || "Abholung auf Anfrage",
      },
      variantGroup: product.variant_group ?? undefined,
      variantLabel: product.variant_label ?? undefined,
    };
  });

  return { categories, products };
}

export const getCatalogData = unstable_cache(readCatalog, ["catalog-v4"], {
  revalidate: 900,
  tags: ["catalog"],
});

const getCachedPublicCategories = unstable_cache(readPublicCategories, ["public-categories-v1"], {
  revalidate: 900,
  tags: ["catalog"],
});

export function getPublicCategories() {
  if (!hasSupabaseConfig) return Promise.resolve(fallbackCategories);
  return getCachedPublicCategories();
}

export async function getAdminCatalogData(): Promise<CatalogData> {
  const supabase = await createClient();
  if (!supabase)
    return { categories: fallbackCategories, products: fallbackProducts, source: "demo" };
  return queryCatalog(supabase);
}
