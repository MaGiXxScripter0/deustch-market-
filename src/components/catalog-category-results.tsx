import Link from "next/link";
import type { CategorySearchHit, CatalogQuery } from "@/lib/types";

export function CatalogCategoryResults({
  hits,
  query,
}: {
  hits: CategorySearchHit[];
  query: CatalogQuery;
}) {
  if (!query.q || !hits.length) return null;
  return (
    <section className="catalog-category-results" aria-labelledby="category-results-heading">
      <h2 id="category-results-heading">Passende Kategorien</h2>
      <ul>
        {hits.map((category) => (
          <li key={category.id}>
            <Link href={`/kategorie/${category.slug}?q=${encodeURIComponent(query.q)}`}>
              {category.name} <span>{category.count} Produkte</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
