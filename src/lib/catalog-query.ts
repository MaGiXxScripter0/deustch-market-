import type { CatalogQuery, CatalogSearchParams, CatalogSort } from "./types";

export const CATALOG_PAGE_SIZE = 24;

const sortValues = new Set<CatalogSort>([
  "relevance",
  "featured",
  "price-asc",
  "price-desc",
  "name",
]);

export type CatalogHrefPatch = {
  q?: string;
  category?: string;
  brand?: string;
  spec?: string;
  availability?: "pickup";
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  page?: number;
  toggle?: "brand" | "spec";
  resetFilters?: boolean;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function values(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
}

function positiveNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseSpecs(entries: string[]) {
  return entries.reduce<Record<string, string[]>>((result, entry) => {
    const separator = entry.indexOf(":");
    if (separator <= 0 || separator === entry.length - 1) return result;
    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (!key || !value) return result;
    result[key] = [...(result[key] ?? []), value];
    return result;
  }, {});
}

export function parseCatalogQuery(input: CatalogSearchParams): CatalogQuery {
  const q = first(input.q)?.trim() ?? "";
  const requestedSort = first(input.sort);
  const sort = sortValues.has(requestedSort as CatalogSort)
    ? (requestedSort as CatalogSort)
    : q
      ? "relevance"
      : "featured";
  const page = Number.parseInt(first(input.page) ?? "1", 10);
  const availability = first(input.availability) === "pickup" ? "pickup" : undefined;

  return {
    q,
    category: first(input.category)?.trim() || undefined,
    brands: values(input.brand).map((value) => value.trim()).filter(Boolean),
    availability,
    minPrice: positiveNumber(first(input.minPrice)),
    maxPrice: positiveNumber(first(input.maxPrice)),
    specs: parseSpecs(values(input.spec)),
    sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function appendAll(target: URLSearchParams, name: string, entries: string[]) {
  entries.forEach((entry) => target.append(name, entry));
}

function defaultSort(query: string): CatalogSort {
  return query ? "relevance" : "featured";
}

export function buildCatalogHref(
  pathname: string,
  current: URLSearchParams,
  patch: CatalogHrefPatch,
): string {
  const next = new URLSearchParams(current);

  if (patch.resetFilters) {
    ["category", "brand", "spec", "availability", "minPrice", "maxPrice", "sort", "page"].forEach(
      (name) => next.delete(name),
    );
  }

  if ("q" in patch) {
    const q = patch.q?.trim();
    if (q) next.set("q", q);
    else next.delete("q");
  }

  (["category", "availability", "minPrice", "maxPrice", "sort"] as const).forEach((name) => {
    if (!(name in patch)) return;
    const value = patch[name];
    if (value === undefined || value === "") next.delete(name);
    else next.set(name, String(value));
  });

  if (patch.toggle && patch[patch.toggle]) {
    const name = patch.toggle;
    const value = patch[name] as string;
    const existing = next.getAll(name);
    next.delete(name);
    appendAll(
      next,
      name,
      existing.includes(value) ? existing.filter((entry) => entry !== value) : [...existing, value],
    );
  }

  if ("page" in patch && patch.page && patch.page > 1) next.set("page", String(patch.page));
  else if (!("page" in patch) || Object.keys(patch).some((name) => name !== "page")) next.delete("page");

  const query = next.get("q") ?? "";
  if (next.get("sort") === defaultSort(query)) next.delete("sort");

  const ordered = new URLSearchParams();
  ["q", "category", "brand", "availability", "minPrice", "maxPrice", "spec", "sort", "page"].forEach(
    (name) => appendAll(ordered, name, next.getAll(name)),
  );
  const serialized = ordered.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
