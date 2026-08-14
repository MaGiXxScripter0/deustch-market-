import Image from "next/image";
import Link from "next/link";
import { toggleProductAction } from "@/lib/actions";
import { euro } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";
import { getCurrentProfile } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AdminProductsPage() {
  const auth = await getCurrentProfile();
  const { products } = await getCatalogData();
  const enabled = auth?.profile?.role === "admin";
  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">KATALOG</p>
          <h1>Produkte</h1>
        </div>
        <Link className="button primary" href="/admin/produkte/neu">
          + Produkt anlegen
        </Link>
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
          <span>Berlin / Lager</span>
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
              {product.inventory.berlin} / {product.inventory.warehouse}
            </span>
            <form action={toggleProductAction}>
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="active" value="false" />
              <button disabled={!enabled} type="submit">
                Aktiv
              </button>
            </form>
          </article>
        ))}
      </div>
    </main>
  );
}
