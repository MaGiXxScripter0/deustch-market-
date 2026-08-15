"use client";

import Link from "next/link";
import { buildCatalogHref } from "@/lib/catalog-query";
import type { CatalogQuery } from "@/lib/types";

export function CatalogPagination({
  pathname,
  query,
  pageCount,
}: {
  pathname: string;
  query: CatalogQuery;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const current = new URLSearchParams();
  if (query.q) current.set("q", query.q);
  if (query.category) current.set("category", query.category);
  query.brands.forEach((brand) => current.append("brand", brand));
  if (query.availability) current.set("availability", query.availability);
  if (query.minPrice !== undefined) current.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) current.set("maxPrice", String(query.maxPrice));
  Object.entries(query.specs).forEach(([key, values]) =>
    values.forEach((value) => current.append("spec", `${key}:${value}`)),
  );
  if (query.sort !== (query.q ? "relevance" : "featured")) current.set("sort", query.sort);

  return (
    <nav className="catalog-pagination" aria-label="Suchergebnisseiten">
      {query.page > 1 && (
        <Link href={buildCatalogHref(pathname, current, { page: query.page - 1 })}>
          Vorherige Seite
        </Link>
      )}
      <span aria-current="page">
        Seite {query.page} von {pageCount}
      </span>
      {query.page < pageCount && (
        <Link href={buildCatalogHref(pathname, current, { page: query.page + 1 })}>
          Nächste Seite
        </Link>
      )}
    </nav>
  );
}
