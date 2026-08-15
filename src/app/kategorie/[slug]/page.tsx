import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { JsonLd } from "@/components/json-ld";
import { parseCatalogQuery } from "@/lib/catalog-query";
import { searchCatalog } from "@/lib/catalog-search";
import { getPublicCategories } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 900;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getPublicCategories();
  const category = categories.find((item) => item.slug === slug);
  return category
    ? {
        title: `${category.name} | ${siteConfig.name}`,
        description: category.description,
        alternates: { canonical: `/kategorie/${category.slug}` },
      }
    : {};
}
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, rawQuery] = await Promise.all([params, searchParams]);
  const query = parseCatalogQuery(rawQuery);
  const categoriesPromise = getPublicCategories();
  const resultPromise = searchCatalog(query, slug);
  const [categories, result] = await Promise.all([categoriesPromise, resultPromise]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <main className="shell page-main">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: category.name,
          numberOfItems: result.total,
          itemListElement: result.items.map((product, index) => ({
            "@type": "ListItem",
            position: (result.page - 1) * result.pageSize + index + 1,
            url: `${base}/produkt/${product.slug}`,
            name: product.name,
          })),
        }}
      />
      <div className="page-hero category-page-hero">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / <Link href="/sortiment">Sortiment</Link> /{" "}
          {category.name}
        </p>
        <span className="category-number">{category.number}</span>
        <p className="kicker">KATEGORIE</p>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
        <div className="category-facets">
          {category.filterKeys.map((key) => (
            <span key={key}>{key}</span>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="loading-card">Produkte werden geladen …</div>}>
        <CatalogView
          pathname={`/kategorie/${slug}`}
          query={query}
          result={result}
          categories={categories}
          activeCategory={slug}
        />
      </Suspense>
    </main>
  );
}
