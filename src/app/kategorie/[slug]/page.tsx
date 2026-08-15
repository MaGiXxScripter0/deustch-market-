import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { JsonLd } from "@/components/json-ld";
import { getCatalogData } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 900;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { categories } = await getCatalogData();
  const category = categories.find((item) => item.slug === slug);
  return category
    ? {
        title: `${category.name} | ${siteConfig.name}`,
        description: category.description,
        alternates: { canonical: `/kategorie/${category.slug}` },
      }
    : {};
}
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { categories, products } = await getCatalogData();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const items = products.filter((product) => product.categorySlug === slug);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <main className="shell page-main">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: category.name,
          numberOfItems: items.length,
          itemListElement: items.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
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
          initialProducts={items}
          categories={categories}
          activeCategory={slug}
        />
      </Suspense>
    </main>
  );
}
