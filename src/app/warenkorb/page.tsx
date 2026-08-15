import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { getCatalogData } from "@/lib/catalog-repository";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `Warenkorb | ${siteConfig.name}` };
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
