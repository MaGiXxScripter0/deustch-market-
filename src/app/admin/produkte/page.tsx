import Image from "next/image";
import Link from "next/link";
import { toggleProductAction } from "@/lib/actions";
import { euro } from "@/lib/catalog";
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
      <div className="admin-table">
        <div className="admin-table-head">
          <span>Produkt</span>
          <span>Preis</span>
          <span>Abholbestand</span>
          <span>Status</span>
        </div>
        {products.map((product) => (
          <article key={product.id}>
            <div className="admin-product">
              <span>
                <Image src={product.image} alt="" fill sizes="58px" />
              </span>
              <div>
                <b>
                  <Link href={`/admin/produkte/${product.id}`}>{product.name}</Link>
                </b>
                <small>
                  {product.brand} · {product.sku}
                </small>
              </div>
            </div>
            <strong>{euro.format(product.price)}</strong>
            <span>
              {product.inventory.berlin}
            </span>
            <form action={toggleProductAction}>
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="active" value={String(product.active === false)} />
              <button disabled={!enabled} type="submit">
                {product.active === false ? "Aktivieren" : "Ausblenden"}
              </button>
            </form>
          </article>
        ))}
      </div>
    </main>
  );
}
