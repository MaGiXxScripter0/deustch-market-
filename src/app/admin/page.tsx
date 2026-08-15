import { Boxes, MessageSquareText, PackageCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { products } from "@/lib/catalog-data";
import { getAdminCatalogData } from "@/lib/catalog-repository";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const auth = await getCurrentProfile();
  const isAdmin = auth?.profile?.role === "admin";
  const [catalog, supabase] = await Promise.all([
    isAdmin ? getAdminCatalogData() : Promise.resolve({ products }),
    isAdmin ? createClient() : Promise.resolve(null),
  ]);
  const { count: newOrderCount } = supabase
    ? await supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new")
    : { count: null };
  const currentProducts = catalog.products;
  return (
    <main>
      {!isAdmin && (
        <div className="admin-warning">
          Admin-Vorschau: Melden Sie sich mit einem Benutzer an, dessen Profilrolle in Supabase auf{" "}
          <code>admin</code> gesetzt wurde, um Änderungen zu speichern.
        </div>
      )}
      <div className="admin-heading">
        <div>
          <p className="kicker">BACKOFFICE</p>
          <h1>Übersicht</h1>
        </div>
        <span>{new Date().toLocaleDateString("de-DE", { dateStyle: "long" })}</span>
      </div>
      <div className="admin-stats">
        <article>
          <Boxes />
          <span>
            <small>Aktive Produkte</small>
            <strong>{currentProducts.filter((product) => product.active !== false).length}</strong>
          </span>
        </article>
        <article>
          <PackageCheck />
          <span>
            <small>Bestand {siteConfig.storeName}</small>
            <strong>{currentProducts.reduce((sum, item) => sum + item.inventory.berlin, 0)}</strong>
          </span>
        </article>
        <article>
          <MessageSquareText />
          <span>
            <small>Neue Bestellungen</small>
            <strong>{newOrderCount ?? 0}</strong>
          </span>
        </article>
        <article>
          <UsersRound />
          <span>
            <small>Kundenkonten</small>
            <strong>—</strong>
          </span>
        </article>
      </div>
      {Boolean(newOrderCount) && (
        <section className="admin-new-orders">
          <MessageSquareText aria-hidden="true" />
          <span>
            <b>
              {newOrderCount} neue Abholbestellung{newOrderCount === 1 ? "" : "en"}
            </b>
            <small>Bitte Bestand zusammenstellen und den Status aktualisieren.</small>
          </span>
          <Link href="/admin/anfragen">Jetzt bearbeiten →</Link>
        </section>
      )}
      <section className="admin-panel">
        <h2>Schnellzugriff</h2>
        <div className="admin-shortcuts">
          <Link href="/admin/produkte">Produktbestand prüfen →</Link>
          <Link href="/admin/anfragen">Bestellungen zusammenstellen →</Link>
          <Link href="/admin/kategorien">Kategorien sortieren →</Link>
        </div>
      </section>
    </main>
  );
}
