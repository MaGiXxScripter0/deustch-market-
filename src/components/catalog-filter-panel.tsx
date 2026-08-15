"use client";

import { X } from "lucide-react";
import type { Category, Product } from "@/lib/types";

export type SpecFacet = { key: string; values: string[] };

type SetParam = (name: string, value?: string, multi?: boolean) => void;

export function CatalogFilterPanel({
  initialProducts,
  categories,
  activeCategory,
  categoryFilter,
  activeBrands,
  activeSpecs,
  availability,
  minPrice,
  maxPrice,
  brands,
  specFacets,
  resultCount,
  hasFilters,
  setParam,
  onClose,
  onReset,
}: {
  initialProducts: Product[];
  categories: Category[];
  activeCategory?: string;
  categoryFilter: string;
  activeBrands: string[];
  activeSpecs: string[];
  availability: string;
  minPrice: string;
  maxPrice: string;
  brands: string[];
  specFacets: SpecFacet[];
  resultCount: number;
  hasFilters: boolean;
  setParam: SetParam;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <aside className="filter-panel">
      <div className="filter-mobile-head">
        <b>Filter</b>
        <button type="button" onClick={onClose} aria-label="Filter schließen">
          <X />
        </button>
      </div>
      {!activeCategory && (
        <fieldset>
          <legend>Kategorie</legend>
          <FilterChoice
            type="radio"
            name="category"
            checked={!categoryFilter}
            onChange={() => setParam("category")}
            label="Alle Kategorien"
          />
          {categories.map((category) => (
            <FilterChoice
              key={category.slug}
              type="radio"
              name="category"
              checked={categoryFilter === category.slug}
              onChange={() => setParam("category", category.slug)}
              label={category.shortName}
              count={initialProducts.filter((item) => item.categorySlug === category.slug).length}
            />
          ))}
        </fieldset>
      )}
      {activeCategory && (
        <fieldset>
          <legend>Kategorie</legend>
          <label className="filter-category filter-category-active">
            {categories.find((category) => category.slug === activeCategory)?.shortName ??
              activeCategory}
          </label>
        </fieldset>
      )}
      <fieldset>
        <legend>Verfügbarkeit</legend>
        <FilterChoice
          type="radio"
          name="availability"
          checked={!availability}
          onChange={() => setParam("availability")}
          label="Alle Produkte"
        />
        <FilterChoice
          type="radio"
          name="availability"
          checked={availability === "pickup"}
          onChange={() => setParam("availability", "pickup")}
          label="Heute abholbar"
        />
      </fieldset>
      <fieldset>
        <legend>Marke</legend>
        {brands.map((brand) => (
          <FilterChoice
            key={brand}
            type="checkbox"
            checked={activeBrands.includes(brand)}
            onChange={() => setParam("brand", brand, true)}
            label={brand}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend>Preis</legend>
        <div className="price-filter">
          <PriceInput
            label="Von"
            value={minPrice}
            placeholder="0 €"
            onChange={(value) => setParam("minPrice", value)}
          />
          <PriceInput
            label="Bis"
            value={maxPrice}
            placeholder="250 €"
            onChange={(value) => setParam("maxPrice", value)}
          />
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
              <FilterChoice
                key={selection}
                type="checkbox"
                checked={activeSpecs.includes(selection)}
                onChange={() => setParam("spec", selection, true)}
                label={value}
                count={count}
              />
            );
          })}
        </fieldset>
      ))}
      {hasFilters && (
        <button className="reset-filters" type="button" onClick={onReset}>
          Alle zurücksetzen
        </button>
      )}
      <button className="filter-mobile-apply" type="button" onClick={onClose}>
        {resultCount} {resultCount === 1 ? "Produkt" : "Produkte"} anzeigen
      </button>
    </aside>
  );
}

function FilterChoice({
  type,
  name,
  checked,
  onChange,
  label,
  count,
}: {
  type: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label>
      <input type={type} name={name} checked={checked} onChange={onChange} /> {label}
      {count !== undefined && <small>({count})</small>}
    </label>
  );
}

function PriceInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
