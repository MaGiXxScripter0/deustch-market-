import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { getBrands } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";

export const metadata: Metadata = {
  title: "Sortiment | Demo Baustoffmarkt",
  description: "24 ausgewählte Baustoffe für Trockenbau, Rohbau, Dämmung, Holz und Dach.",
};
export default async function SortimentPage() {
  const { categories, products } = await getCatalogData();
  return (
    <main className="shell page-main">
      <div className="page-hero">
        <p className="breadcrumbs">
          <Link href="/">Startseite</Link> / Sortiment
        </p>
        <p className="kicker">24 PRODUKTE · 6 KATEGORIEN</p>
        <h1>Baustoffe für klare Entscheidungen.</h1>
        <p>
          Übersichtlich sortiert, transparent bepreist und mit aktuellem Bestand für Berlin-Mitte.
        </p>
      </div>
      <Suspense fallback={<div className="loading-card">Sortiment wird geladen …</div>}>
        <CatalogView initialProducts={products} categories={categories} brands={getBrands()} />
      </Suspense>
    </main>
  );
}
