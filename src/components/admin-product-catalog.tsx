"use client";

import Image from "next/image";
import Link from "next/link";
import { Grid2X2, List, Search, X } from "lucide-react";
import { useState } from "react";
import { toggleProductAction } from "@/lib/actions";
import { filterAdminProducts } from "@/lib/admin-product-search";
import { euro } from "@/lib/catalog";
import type { Product } from "@/lib/types";

type ViewMode = "list" | "grid";

type AdminProductCatalogProps = {
  products: Product[];
  enabled: boolean;
};

function ProductStatus({ product, enabled }: { product: Product; enabled: boolean }) {
  const inactive = product.active === false;

  return (
    <form action={toggleProductAction} className="admin-product-status">
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="active" value={String(inactive)} />
      <button disabled={!enabled} type="submit">
        {inactive ? "Aktivieren" : "Ausblenden"}
      </button>
    </form>
  );
}

export function AdminProductCatalog({ products, enabled }: AdminProductCatalogProps) {
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const filteredProducts = filterAdminProducts(query, products);

  return (
    <section className={`admin-product-browser is-${view}`} aria-label="Produktübersicht">
      <div className="admin-product-toolbar">
        <label className="admin-product-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Produkte durchsuchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Marke oder Artikelnummer"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              aria-label="Suche leeren"
              onClick={() => setQuery("")}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </label>
        <span className="admin-product-result-count" aria-live="polite">
          {filteredProducts.length} {filteredProducts.length === 1 ? "Produkt" : "Produkte"}
        </span>
        <div className="admin-view-switcher" role="group" aria-label="Ansicht wählen">
          <span>Ansicht</span>
          <button
            type="button"
            className={view === "list" ? "is-active" : undefined}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List aria-hidden="true" /> Liste
          </button>
          <button
            type="button"
            className={view === "grid" ? "is-active" : undefined}
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
          >
            <Grid2X2 aria-hidden="true" /> Grid
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="admin-product-empty" role="status">
          <strong>Keine Produkte gefunden</strong>
          <span>Versuche einen anderen Suchbegriff.</span>
          <button type="button" onClick={() => setQuery("")}>
            Suche leeren
          </button>
        </div>
      ) : view === "list" ? (
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Produkt</span>
            <span>Preis</span>
            <span>Abholbestand</span>
            <span>Status</span>
          </div>
          {filteredProducts.map((product) => (
            <article key={product.id}>
              <div className="admin-product">
                <span>
                  <Image src={product.image} alt="" fill sizes="58px" />
                </span>
                <div>
                  <b>
                    <Link href={`/admin/produkte/${product.id}`}>{product.name}</Link>
                  </b>
                  <small>
                    {product.brand} · {product.sku}
                  </small>
                </div>
              </div>
              <strong>{euro.format(product.price)}</strong>
              <span>{product.inventory.berlin}</span>
              <ProductStatus product={product} enabled={enabled} />
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-product-grid">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className={product.active === false ? "is-inactive" : undefined}
            >
              <Link className="admin-product-grid-image" href={`/admin/produkte/${product.id}`}>
                <Image
                  src={product.image}
                  alt={product.imageAlt}
                  fill
                  sizes="(max-width: 700px) 50vw, (max-width: 1050px) 33vw, 25vw"
                />
              </Link>
              <div className="admin-product-grid-content">
                <small>
                  {product.brand} · {product.sku}
                </small>
                <h2>
                  <Link href={`/admin/produkte/${product.id}`}>{product.name}</Link>
                </h2>
                <div>
                  <strong>{euro.format(product.price)}</strong>
                  <span>{product.inventory.berlin} auf Lager</span>
                </div>
                <ProductStatus product={product} enabled={enabled} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
