import type { Metadata } from "next";
import { RequestForm } from "@/components/request-form";
import { getCatalogData } from "@/lib/catalog-repository";
export const metadata: Metadata = { title: "Angebot anfragen | Demo Baustoffmarkt" };
export default async function RequestPage() {
  const { products } = await getCatalogData();
  return (
    <main className="shell page-main">
      <div className="page-hero compact">
        <p className="kicker">UNVERBINDLICH & PERSÖNLICH</p>
        <h1>Ihr Angebot anfragen.</h1>
        <p>
          Wir prüfen Bestand, Lieferoptionen und Konditionen und melden uns persönlich bei Ihnen.
        </p>
      </div>
      <RequestForm products={products} />
    </main>
  );
}
