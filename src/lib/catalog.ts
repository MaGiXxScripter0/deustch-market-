import { categories, products } from "./catalog-data";
import type { CatalogFilters, Product } from "./types";

export const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function calculatePackages(
  area: number,
  wastePercent: number,
  coveragePerUnit: number,
  pricePerUnit: number,
) {
  const safeArea = Math.max(0, Number.isFinite(area) ? area : 0);
  const safeWaste = Math.max(0, Number.isFinite(wastePercent) ? wastePercent : 0);
  const target = safeArea * (1 + safeWaste / 100);
  const packages = coveragePerUnit > 0 ? Math.ceil(target / coveragePerUnit) : 0;

  return {
    target,
    packages,
    covered: packages * Math.max(0, coveragePerUnit),
    total: packages * Math.max(0, pricePerUnit),
  };
}

export function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function editDistance(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[b.length][a.length];
}

export function searchProducts(
  query: string,
  productItems: Product[] = products,
  categoryItems = categories,
) {
  const q = normalizeSearch(query);
  if (!q) return productItems;
  const terms = q.split(/\s+/);
  return productItems
    .map((product) => {
      const category = categoryItems.find((item) => item.slug === product.categorySlug);
      const exact = normalizeSearch(
        [
          product.name,
          product.sku,
          product.brand,
          category?.name,
          ...product.aliases,
          ...Object.values(product.specs),
        ].join(" "),
      );
      let score = terms.reduce((total, term) => total + (exact.includes(term) ? 5 : 0), 0);
      if (normalizeSearch(product.name).includes(q)) score += 20;
      if (normalizeSearch(product.sku) === q) score += 30;
      if (!score && q.length > 3) {
        const candidates = [product.name, ...product.aliases].flatMap((item) =>
          normalizeSearch(item).split(/\s+/),
        );
        if (
          candidates.some(
            (item) => Math.abs(item.length - q.length) <= 2 && editDistance(item, q) <= 2,
          )
        )
          score = 2;
      }
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.product);
}

export function filterProducts(
  filters: CatalogFilters,
  productItems: Product[] = products,
  categoryItems = categories,
): Product[] {
  let result = filters.q
    ? searchProducts(filters.q, productItems, categoryItems)
    : [...productItems];
  if (filters.category) result = result.filter((item) => item.categorySlug === filters.category);
  if (filters.brands?.length)
    result = result.filter((item) => filters.brands?.includes(item.brand));
  const { availability, minPrice, maxPrice, specs } = filters;
  if (availability) result = result.filter((item) => item.inventory[availability]);
  if (typeof minPrice === "number") result = result.filter((item) => item.price >= minPrice);
  if (typeof maxPrice === "number") result = result.filter((item) => item.price <= maxPrice);
  if (specs) {
    result = result.filter((product) =>
      Object.entries(specs).every(
        ([key, values]) => !values.length || values.includes(String(product.specs[key])),
      ),
    );
  }
  switch (filters.sort) {
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name, "de"));
      break;
    default:
      result.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return result;
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}
export function getVariants(product: Product) {
  return product.variantGroup
    ? products.filter((item) => item.variantGroup === product.variantGroup)
    : [];
}
export function getBrands(items = products) {
  return [...new Set(items.map((item) => item.brand))].sort((a, b) => a.localeCompare(b, "de"));
}

export function suggest(query: string, productItems = products, categoryItems = categories) {
  const q = normalizeSearch(query);
  if (q.length < 2) return [];
  const productResults = searchProducts(q, productItems, categoryItems)
    .slice(0, 4)
    .map((item) => ({
      type: "product",
      label: item.name,
      meta: item.sku,
      href: `/produkt/${item.slug}`,
    }));
  const categoryResults = categoryItems
    .filter((item) => normalizeSearch(`${item.name} ${item.description}`).includes(q))
    .slice(0, 2)
    .map((item) => ({
      type: "category",
      label: item.name,
      meta: "Kategorie",
      href: `/kategorie/${item.slug}`,
    }));
  return [...categoryResults, ...productResults].slice(0, 6);
}

export function findSearchCorrection(query: string, productItems: Product[] = products) {
  const normalized = normalizeSearch(query);
  if (normalized.length < 4) return undefined;
  const candidates = productItems.flatMap((product) =>
    [product.name, ...product.aliases].flatMap((label) =>
      label.split(/\s+/).map((word) => ({ word, normalized: normalizeSearch(word) })),
    ),
  );
  const match = candidates
    .filter(
      (candidate) =>
        candidate.normalized !== normalized &&
        Math.abs(candidate.normalized.length - normalized.length) <= 2,
    )
    .map((candidate) => ({
      ...candidate,
      distance: editDistance(candidate.normalized, normalized),
    }))
    .filter((candidate) => candidate.distance <= 2)
    .sort((a, b) => a.distance - b.distance)[0];
  return match?.word.replace(/[.,;:]$/, "");
}
