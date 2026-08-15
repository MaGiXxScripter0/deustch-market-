import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { JsonLd } from "@/components/json-ld";
import { parseCatalogQuery } from "@/lib/catalog-query";
import { searchCatalog } from "@/lib/catalog-search";
import { getPublicCategories } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Sortiment | ${siteConfig.name}`,
  description: "24 ausgewählte Baustoffe für Trockenbau, Rohbau, Dämmung, Holz und Dach.",
  alternates: { canonical: "/sortiment" },
};
export default async function SortimentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [categories, result] = await Promise.all([getPublicCategories(), searchCatalog(query)]);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <main className="shell page-main">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          numberOfItems: result.total,
          itemListElement: result.items.map((product, index) => ({
            "@type": "ListItem",
            position: (result.page - 1) * result.pageSize + index + 1,
            url: `${base}/produkt/${product.slug}`,
            name: product.name,
          })),
        }}
      />
      <div className="page-hero">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / Sortiment
        </p>
        <p className="kicker">{result.total} PRODUKTE · {categories.length} KATEGORIEN</p>
        <h1>Baustoffe für klare Entscheidungen.</h1>
        <p>
          Übersichtlich sortiert, transparent bepreist und mit aktuellem Bestand für{" "}
          {siteConfig.storeName}.
        </p>
      </div>
      <Suspense fallback={<div className="loading-card">Sortiment wird geladen …</div>}>
        <CatalogView pathname="/sortiment" query={query} result={result} categories={categories} />
      </Suspense>
    </main>
  );
}
