"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { filterProducts } from "@/lib/catalog";
import type { Category, Product } from "@/lib/types";
import { CatalogFilterPanel } from "./catalog-filter-panel";
import { ProductCard } from "./product-card";

export function CatalogView({
  initialProducts,
  categories,
  brands,
  activeCategory,
}: {
  initialProducts: Product[];
  categories: Category[];
  brands: string[];
  activeCategory?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const activeBrands = params.getAll("brand");
  const activeSpecs = params.getAll("spec");
  const availability = params.get("availability") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const sort = params.get("sort") ?? "featured";
  const activeCategoryData = categories.find((category) => category.slug === activeCategory);

  const specFacets = useMemo(
    () =>
      (activeCategoryData?.filterKeys ?? []).map((key) => ({
        key,
        values: [
          ...new Set(
            initialProducts
              .map((product) => product.specs[key])
              .filter((value): value is string | number | boolean => value !== undefined)
              .map(String),
          ),
        ].sort((a, b) => a.localeCompare(b, "de", { numeric: true })),
      })),
    [activeCategoryData, initialProducts],
  );

  const setParam = (name: string, value?: string, multi = false) => {
    const next = new URLSearchParams(params.toString());
    if (multi && value) {
      const current = next.getAll(name);
      next.delete(name);
      (current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      ).forEach((item) => next.append(name, item));
    } else if (value) next.set(name, value);
    else next.delete(name);
    router.push(`?${next.toString()}`, { scroll: false });
  };

  const visible = useMemo(() => {
    const specs: Record<string, string[]> = {};
    activeSpecs.forEach((selection) => {
      const separator = selection.indexOf(":");
      if (separator < 1) return;
      const key = selection.slice(0, separator);
      specs[key] = [...(specs[key] ?? []), selection.slice(separator + 1)];
    });
    return filterProducts(
      {
        brands: activeBrands,
        availability: availability ? "pickup" : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        specs,
        sort: sort as "featured" | "price-asc" | "price-desc" | "name",
      },
      initialProducts,
      categories,
    );
  }, [
    initialProducts,
    categories,
    activeBrands,
    activeSpecs,
    availability,
    minPrice,
    maxPrice,
    sort,
  ]);

  const hasFilters =
    activeBrands.length > 0 || activeSpecs.length > 0 || Boolean(availability || minPrice || maxPrice);

  return (
    <div className="catalog-layout">
      <button
        className="mobile-filter-trigger"
        type="button"
        onClick={() => setMobileFilters(true)}
      >
        <SlidersHorizontal size={17} /> Filter & Sortierung · {visible.length} Produkte
      </button>
      <div className={mobileFilters ? "filter-drawer open" : "filter-drawer"}>
        <CatalogFilterPanel
          initialProducts={initialProducts}
          categories={categories}
          activeCategory={activeCategory}
          activeBrands={activeBrands}
          activeSpecs={activeSpecs}
          availability={availability}
          minPrice={minPrice}
          maxPrice={maxPrice}
          brands={brands}
          specFacets={specFacets}
          resultCount={visible.length}
          hasFilters={hasFilters}
          setParam={setParam}
          onClose={() => setMobileFilters(false)}
          onReset={() => router.push("?", { scroll: false })}
        />
      </div>
      <div className="catalog-results">
        <div className="catalog-toolbar">
          <p>
            <strong>{visible.length}</strong> Produkte
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
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} eager={index < 8} />
          ))}
        </div>
        {visible.length === 0 && (
          <div className="empty-state">
            <h2>Keine Produkte gefunden</h2>
            <p>Entfernen Sie einzelne Filter oder setzen Sie die Auswahl vollständig zurück.</p>
            <button className="button primary" onClick={() => router.push("?")}>
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
