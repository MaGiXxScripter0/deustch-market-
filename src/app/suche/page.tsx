import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { parseCatalogQuery } from "@/lib/catalog-query";
import { searchCatalog } from "@/lib/catalog-search";
import { getPublicCategories } from "@/lib/catalog-repository";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [categories, result] = await Promise.all([getPublicCategories(), searchCatalog(query)]);
  return (
    <main className="shell page-main">
      <div className="page-hero search-page-hero">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / Suche
        </p>
        <p className="kicker">PRODUKTSUCHE</p>
        <h1>{query.q ? `Ergebnisse für „${query.q}”` : "Was benötigen Sie?"}</h1>
        <p>
          {query.q
            ? `${result.total} passende Produkte gefunden.`
            : "Suchen Sie nach Produkt, Kategorie, Marke oder Artikelnummer."}
        </p>
      </div>
      {result.correction && (
        <div className="search-correction">
          Meinten Sie{" "}
          <Link href={`/suche?q=${encodeURIComponent(result.correction)}`}>„{result.correction}”</Link>?
        </div>
      )}
      <Suspense fallback={<div className="loading-card">Produkte werden geladen …</div>}>
        <CatalogView
          pathname="/suche"
          query={query}
          result={result}
          categories={categories}
        />
      </Suspense>
    </main>
  );
}
