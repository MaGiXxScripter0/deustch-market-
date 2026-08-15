import { categories, products } from "./catalog-data";
import { filterProducts, findSearchCorrection } from "./catalog";
import { createPublicClient } from "./supabase/server";
import type {
  CatalogFacetValue,
  CatalogFacets,
  CatalogQuery,
  CatalogSearchResult,
  CatalogSort,
  Category,
  Product,
} from "./types";

const pageSize = 24 as const;

function createDemoFacets(items: Product[], categoryItems: Category[]): CatalogFacets {
  const categories = categoryItems
    .map((category) => ({
      ...category,
      count: items.filter((item) => item.categorySlug === category.slug).length,
    }))
    .filter((category) => category.count > 0);
  const brands = new Map<string, number>();
  const specs = new Map<string, Map<string, number>>();

  for (const item of items) {
    brands.set(item.brand, (brands.get(item.brand) ?? 0) + 1);
    for (const [key, value] of Object.entries(item.specs)) {
      const values = specs.get(key) ?? new Map<string, number>();
      const text = String(value);
      values.set(text, (values.get(text) ?? 0) + 1);
      specs.set(key, values);
    }
  }

  return {
    categories,
    brands: [...brands]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, "de")),
    minPrice: items.length ? Math.min(...items.map((item) => item.price)) : null,
    maxPrice: items.length ? Math.max(...items.map((item) => item.price)) : null,
    specs: Object.fromEntries(
      [...specs].map(([key, values]) => [
        key,
        [...values]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, "de")),
      ]),
    ),
  };
}

function searchDemoCatalog(query: CatalogQuery, categoryScope?: string): CatalogSearchResult {
  const filtered = filterProducts(
    {
      ...query,
      category: categoryScope ?? query.category,
    },
    products,
    categories,
  );
  const start = (query.page - 1) * pageSize;
  const total = filtered.length;
  const pageCount = Math.ceil(total / pageSize);

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: query.page,
    pageSize,
    pageCount,
    hasPreviousPage: query.page > 1,
    hasNextPage: start + pageSize < total,
    facets: createDemoFacets(filtered, categories),
    correction: query.q ? findSearchCorrection(query.q, products) : undefined,
    source: "demo",
  };
}

function isFacetValue(value: unknown): value is CatalogFacetValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as CatalogFacetValue).value === "string" &&
      typeof (value as CatalogFacetValue).count === "number",
  );
}

function isCatalogResult(value: unknown): value is Omit<CatalogSearchResult, "source" | "correction"> {
  if (!value || typeof value !== "object") return false;
  const result = value as Omit<CatalogSearchResult, "source" | "correction">;
  return (
    Array.isArray(result.items) &&
    typeof result.total === "number" &&
    typeof result.page === "number" &&
    result.pageSize === pageSize &&
    typeof result.pageCount === "number" &&
    typeof result.hasPreviousPage === "boolean" &&
    typeof result.hasNextPage === "boolean" &&
    Array.isArray(result.facets?.categories) &&
    Array.isArray(result.facets?.brands) &&
    result.facets.brands.every(isFacetValue)
  );
}

export async function searchCatalog(
  query: CatalogQuery,
  categoryScope?: string,
): Promise<CatalogSearchResult> {
  const supabase = createPublicClient();
  if (!supabase) return searchDemoCatalog(query, categoryScope);

  const { data, error } = await supabase.rpc("search_products", {
    search_query: query.q,
    category_slug: categoryScope ?? query.category,
    filter_values: {
      brands: query.brands,
      availability: query.availability,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      specs: query.specs,
    },
    sort_order: query.sort satisfies CatalogSort,
    page_number: query.page,
  });

  if (!error && isCatalogResult(data)) return { ...data, source: "supabase" };
  if (process.env.NODE_ENV !== "production") return searchDemoCatalog(query, categoryScope);
  throw new Error("Die Produktsuche ist vorübergehend nicht verfügbar.");
}

export { pageSize as CATALOG_SEARCH_PAGE_SIZE, searchDemoCatalog };
