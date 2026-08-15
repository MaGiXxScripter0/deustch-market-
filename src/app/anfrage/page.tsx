import type { Metadata } from "next";
import { RequestForm } from "@/components/request-form";
import { getCatalogData } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `Bestellung zur Abholung | ${siteConfig.name}` };
export default async function RequestPage() {
  const { products } = await getCatalogData();
  return (
    <main className="shell page-main">
      <div className="page-hero compact">
        <p className="kicker">NUR ABHOLUNG IM MARKT</p>
        <h1>Bestellung abschließen.</h1>
        <p>
          Wir prüfen Ihren Bestand, stellen die Ware zusammen und informieren Sie, sobald Ihre
          Bestellung bereitliegt.
        </p>
      </div>
      <RequestForm products={products} />
    </main>
  );
}
