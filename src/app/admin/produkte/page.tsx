import Link from "next/link";
import { AdminProductCatalog } from "@/components/admin-product-catalog";
import { getAdminCatalogData } from "@/lib/catalog-repository";
import { getCurrentProfile } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AdminProductsPage() {
  const auth = await getCurrentProfile();
  const { products } = await getAdminCatalogData();
  const enabled = auth?.profile?.role === "admin";
  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">KATALOG</p>
          <h1>Produkte</h1>
        </div>
        <div className="admin-heading-actions">
          <Link className="button secondary" href="/admin/produkte/import">
            CSV importieren
          </Link>
          <Link className="button primary" href="/admin/produkte/neu">
            + Produkt anlegen
          </Link>
        </div>
      </div>
      {!enabled && (
        <div className="admin-warning">
          Vorschaumodus: Schreibvorgänge sind nur mit einem Admin-Konto möglich.
        </div>
      )}
      <AdminProductCatalog products={products} enabled={enabled} />
    </main>
  );
}
