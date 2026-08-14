"use client";

import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Product } from "@/lib/types";
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
    let result = [...initialProducts];
    if (activeBrands.length) result = result.filter((item) => activeBrands.includes(item.brand));
    if (availability)
      result = result.filter((item) => item.inventory[availability as "pickup" | "delivery"]);
    if (minPrice) result = result.filter((item) => item.price >= Number(minPrice));
    if (maxPrice) result = result.filter((item) => item.price <= Number(maxPrice));
    if (activeSpecs.length) {
      const selections = new Map<string, string[]>();
      activeSpecs.forEach((selection) => {
        const separator = selection.indexOf(":");
        if (separator < 1) return;
        const key = selection.slice(0, separator);
        const value = selection.slice(separator + 1);
        selections.set(key, [...(selections.get(key) ?? []), value]);
      });
      result = result.filter((product) =>
        [...selections].every(([key, values]) => values.includes(String(product.specs[key]))),
      );
    }
    if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "de"));
    return result;
  }, [initialProducts, activeBrands, activeSpecs, availability, minPrice, maxPrice, sort]);

  const hasFilters =
    activeBrands.length > 0 || activeSpecs.length > 0 || Boolean(availability || minPrice || maxPrice);

  const filterPanel = (
    <aside className="filter-panel">
      <div className="filter-mobile-head">
        <b>Filter</b>
        <button type="button" onClick={() => setMobileFilters(false)} aria-label="Filter schließen">
          <X />
        </button>
      </div>
      {!activeCategory && (
        <fieldset>
          <legend>Kategorie</legend>
          {categories.map((category) => (
            <Link
              className="filter-category"
              key={category.slug}
              href={`/kategorie/${category.slug}`}
            >
              {category.shortName}
              <span>
                {initialProducts.filter((item) => item.categorySlug === category.slug).length}
              </span>
            </Link>
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend>Verfügbarkeit</legend>
        <label>
          <input
            type="radio"
            name="availability"
            checked={!availability}
            onChange={() => setParam("availability")}
          />{" "}
          Alle Produkte
        </label>
        <label>
          <input
            type="radio"
            name="availability"
            checked={availability === "pickup"}
            onChange={() => setParam("availability", "pickup")}
          />{" "}
          Heute abholbar
        </label>
        <label>
          <input
            type="radio"
            name="availability"
            checked={availability === "delivery"}
            onChange={() => setParam("availability", "delivery")}
          />{" "}
          Online lieferbar
        </label>
      </fieldset>
      <fieldset>
        <legend>Marke</legend>
        {brands.map((brand) => (
          <label key={brand}>
            <input
              type="checkbox"
              checked={activeBrands.includes(brand)}
              onChange={() => setParam("brand", brand, true)}
            />{" "}
            {brand}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Preis</legend>
        <div className="price-filter">
          <label>
            Von
            <input
              type="number"
              min="0"
              step="1"
              value={minPrice}
              placeholder="0 €"
              onChange={(event) => setParam("minPrice", event.target.value)}
            />
          </label>
          <label>
            Bis
            <input
              type="number"
              min="0"
              step="1"
              value={maxPrice}
              placeholder="250 €"
              onChange={(event) => setParam("maxPrice", event.target.value)}
            />
          </label>
        </div>
      </fieldset>
      {specFacets.map((facet) => (
        <fieldset key={facet.key}>
          <legend>{facet.key}</legend>
          {facet.values.map((value) => {
            const selection = `${facet.key}:${value}`;
            const count = initialProducts.filter(
              (product) => String(product.specs[facet.key]) === value,
            ).length;
            return (
              <label key={selection}>
                <input
                  type="checkbox"
                  checked={activeSpecs.includes(selection)}
                  onChange={() => setParam("spec", selection, true)}
                />{" "}
                {value} <small>({count})</small>
              </label>
            );
          })}
        </fieldset>
      ))}
      {hasFilters && (
        <button
          className="reset-filters"
          type="button"
          onClick={() => router.push("?", { scroll: false })}
        >
          Alle zurücksetzen
        </button>
      )}
    </aside>
  );

  return (
    <div className="catalog-layout">
      <button
        className="mobile-filter-trigger"
        type="button"
        onClick={() => setMobileFilters(true)}
      >
        <SlidersHorizontal size={17} /> Filter & Sortierung · {visible.length} Produkte
      </button>
      <div className={mobileFilters ? "filter-drawer open" : "filter-drawer"}>{filterPanel}</div>
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
                {availability === "pickup" ? "Heute abholbar" : "Online lieferbar"} <X size={13} />
              </button>
            )}
            {minPrice && (
              <button type="button" onClick={() => setParam("minPrice") }>
                Ab {minPrice} € <X size={13} />
              </button>
            )}
            {maxPrice && (
              <button type="button" onClick={() => setParam("maxPrice") }>
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
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
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
