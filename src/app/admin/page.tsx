import { Boxes, MessageSquareText, PackageCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { products } from "@/lib/catalog-data";
import { getCurrentProfile } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const auth = await getCurrentProfile();
  const isAdmin = auth?.profile?.role === "admin";
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
            <strong>{products.length}</strong>
          </span>
        </article>
        <article>
          <PackageCheck />
          <span>
            <small>Bestand Berlin</small>
            <strong>{products.reduce((sum, item) => sum + item.inventory.berlin, 0)}</strong>
          </span>
        </article>
        <article>
          <MessageSquareText />
          <span>
            <small>Neue Anfragen</small>
            <strong>3</strong>
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
      <section className="admin-panel">
        <h2>Schnellzugriff</h2>
        <div className="admin-shortcuts">
          <Link href="/admin/produkte">Produktbestand prüfen →</Link>
          <Link href="/admin/anfragen">Neue Anfragen bearbeiten →</Link>
          <Link href="/admin/kategorien">Kategorien sortieren →</Link>
        </div>
      </section>
    </main>
  );
}
