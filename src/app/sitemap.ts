import type { MetadataRoute } from "next";
import { getCatalogData } from "@/lib/catalog-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { categories, products } = await getCatalogData();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/sortiment",
    "/suche",
    "/versand",
    "/bestellung",
    "/impressum",
    "/datenschutz",
    "/agb",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...categories.map((item) => ({
      url: `${base}/kategorie/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((item) => ({
      url: `${base}/produkt/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
