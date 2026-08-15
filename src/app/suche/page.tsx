import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { findSearchCorrection, searchProducts } from "@/lib/catalog";
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
      {results.length > 0 ? (
        <div className="product-grid catalog-grid search-results">
          {results.map((product, index) => (
            <ProductCard key={product.id} product={product} eager={index < 8} />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <SearchX size={48} />
          <h2>Leider keine direkten Treffer.</h2>
          <p>Prüfen Sie die Schreibweise oder entdecken Sie eine unserer Kategorien.</p>
          <div>
            {categories.slice(0, 3).map((category) => (
              <Link key={category.slug} href={`/kategorie/${category.slug}`}>
                {category.shortName} →
              </Link>
            ))}
          </div>
          <h3>Beliebte Produkte</h3>
          <div className="product-grid">
            {products
              .filter((item) => item.featured)
              .slice(0, 4)
              .map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
          </div>
        </div>
      )}
    </main>
  );
}
