import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { findSearchCorrection, searchProducts } from "@/lib/catalog";
import { getBrands } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Produktsuche | ${siteConfig.name}`,
  description: "Baustoffe nach Produktname, Kategorie oder Artikelnummer finden.",
  alternates: { canonical: "/suche" },
  robots: { index: false, follow: true },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const { categories, products } = await getCatalogData();
  const results = searchProducts(query, products, categories);
  const correction = findSearchCorrection(query, products);
  return (
    <main className="shell page-main">
      <div className="page-hero search-page-hero">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / Suche
        </p>
        <p className="kicker">PRODUKTSUCHE</p>
        <h1>{query ? `Ergebnisse für „${query}”` : "Was benötigen Sie?"}</h1>
        <p>
          {query
            ? `${results.length} passende Produkte gefunden.`
            : "Suchen Sie nach Produkt, Kategorie, Marke oder Artikelnummer."}
        </p>
      </div>
      {correction && (
        <div className="search-correction">
          Meinten Sie{" "}
          <Link href={`/suche?q=${encodeURIComponent(correction)}`}>„{correction}”</Link>?
        </div>
      )}
      <Suspense fallback={<div className="loading-card">Produkte werden geladen …</div>}>
        <CatalogView
          initialProducts={products}
          categories={categories}
          brands={getBrands(products)}
          initialQuery={query}
        />
      </Suspense>
    </main>
  );
}
