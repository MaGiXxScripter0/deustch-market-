"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCatalogHref } from "@/lib/catalog-query";
import type { CatalogQuery, CatalogSearchResult, Category } from "@/lib/types";
import { CatalogFilterPanel } from "./catalog-filter-panel";
import { CatalogPagination } from "./catalog-pagination";
import { ProductCard } from "./product-card";

export function CatalogView({
  pathname,
  query,
  result,
  categories,
  activeCategory,
}: {
  pathname: string;
  query: CatalogQuery;
  result: CatalogSearchResult;
  categories: Category[];
  activeCategory?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const activeBrands = query.brands;
  const activeSpecs = Object.entries(query.specs).flatMap(([key, values]) =>
    values.map((value) => `${key}:${value}`),
  );
  const categoryFilter = query.category ?? "";
  const scopedCategory = activeCategory ?? categoryFilter;
  const availability = query.availability ?? "";
  const minPrice = query.minPrice?.toString() ?? "";
  const maxPrice = query.maxPrice?.toString() ?? "";
  const sort = query.sort;
  const activeCategoryData = categories.find(
    (category) => category.slug === scopedCategory,
  );

  const specFacets = useMemo(
    () =>
      (activeCategoryData?.filterKeys ?? []).map((key) => ({
        key,
        values: [
          ...new Set(
            result.items
              .map((product) => product.specs[key])
              .filter((value): value is string | number | boolean => value !== undefined)
              .map(String),
          ),
        ].sort((a, b) => a.localeCompare(b, "de", { numeric: true })),
      })),
    [activeCategoryData, result.items],
  );

  const setParam = (name: string, value?: string, multi = false) => {
    const patch = multi
      ? { [name]: value, toggle: name as "brand" | "spec" }
      : { [name]: value };
    router.push(buildCatalogHref(pathname, params, patch), { scroll: false });
  };

  const resetFilters = () => {
    router.push(buildCatalogHref(pathname, params, { resetFilters: true }), { scroll: false });
  };

  const hasFilters =
    activeBrands.length > 0 ||
    activeSpecs.length > 0 ||
    Boolean(categoryFilter || availability || minPrice || maxPrice);

  return (
    <div className="catalog-layout">
      <button
        className="mobile-filter-trigger"
        type="button"
        onClick={() => setMobileFilters(true)}
      >
        <SlidersHorizontal size={17} /> Filter & Sortierung · {result.total} Produkte
      </button>
      <div className={mobileFilters ? "filter-drawer open" : "filter-drawer"}>
        <CatalogFilterPanel
          initialProducts={result.items}
          categories={categories}
          activeCategory={activeCategory}
          categoryFilter={categoryFilter}
          activeBrands={activeBrands}
          activeSpecs={activeSpecs}
          availability={availability}
          minPrice={minPrice}
          maxPrice={maxPrice}
          brands={result.facets.brands.map((facet) => facet.value)}
          specFacets={specFacets}
          resultCount={result.total}
          hasFilters={hasFilters}
          setParam={setParam}
          onClose={() => setMobileFilters(false)}
          onReset={resetFilters}
        />
      </div>
      <div className="catalog-results">
        <div className="catalog-toolbar">
          <p>
            <strong>{result.total}</strong> {result.total === 1 ? "Produkt" : "Produkte"}
          </p>
          <label>
            Sortieren nach
            <select value={sort} onChange={(event) => setParam("sort", event.target.value)}>
              <option value="featured">Empfehlung</option>
              <option value="price-asc">Preis aufsteigend</option>
              <option value="price-desc">Preis absteigend</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
        {hasFilters && (
          <div className="filter-chips">
            {categoryFilter && (
              <button type="button" onClick={() => setParam("category")}>
                {categories.find((category) => category.slug === categoryFilter)?.shortName ??
                  categoryFilter} <X size={13} />
              </button>
            )}
            {activeBrands.map((brand) => (
              <button type="button" key={brand} onClick={() => setParam("brand", brand, true)}>
                {brand} <X size={13} />
              </button>
            ))}
            {availability && (
              <button type="button" onClick={() => setParam("availability")}>
                Heute abholbar <X size={13} />
              </button>
            )}
            {minPrice && (
              <button type="button" onClick={() => setParam("minPrice")}>
                Ab {minPrice} € <X size={13} />
              </button>
            )}
            {maxPrice && (
              <button type="button" onClick={() => setParam("maxPrice")}>
                Bis {maxPrice} € <X size={13} />
              </button>
            )}
            {activeSpecs.map((selection) => (
              <button
                type="button"
                key={selection}
                onClick={() => setParam("spec", selection, true)}
              >
                {selection.replace(":", ": ")} <X size={13} />
              </button>
            ))}
          </div>
        )}
        <div className="product-grid catalog-grid">
          {result.items.map((product, index) => (
            <ProductCard key={product.id} product={product} eager={index < 8} />
          ))}
        </div>
        <CatalogPagination pathname={pathname} query={query} pageCount={result.pageCount} />
        {result.items.length === 0 && (
          <div className="empty-state">
            <h2>
              {query.q ? `Keine Produkte für „${query.q}“ gefunden` : "Keine Produkte gefunden"}
            </h2>
            <p>Entfernen Sie einzelne Filter oder passen Sie Ihre Suche an.</p>
            <div className="empty-state-actions">
              {query.q && (
                <button
                  className="button secondary"
                  onClick={() => router.push(buildCatalogHref(pathname, params, { q: undefined }))}
                >
                  Suche leeren
                </button>
              )}
              {hasFilters && (
                <button className="button primary" onClick={resetFilters}>
                  Filter zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
