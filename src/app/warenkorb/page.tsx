import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { getCatalogData } from "@/lib/catalog-repository";
export const metadata: Metadata = { title: "Warenkorb | Demo Baustoffmarkt" };
export default async function CartPage() {
  const { products } = await getCatalogData();
  return (
    <main className="shell page-main">
      <div className="page-hero compact">
        <p className="kicker">WARENKORB</p>
        <h1>Material für Ihr Projekt.</h1>
      </div>
      <CartView products={products} />
    </main>
  );
}
