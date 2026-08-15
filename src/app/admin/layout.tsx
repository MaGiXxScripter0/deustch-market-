import Link from "next/link";
import { ArrowUpRight, Store } from "lucide-react";
import { AdminNavigation } from "@/components/admin-navigation";
import { getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCurrentProfile();
  const isPreview = process.env.NODE_ENV !== "production";

  if (auth?.profile?.role !== "admin" && !isPreview) {
    return (
      <main className="admin-access-gate">
        <p className="kicker">GESCHÜTZTER BEREICH</p>
        <h1>Admin-Anmeldung erforderlich</h1>
        <p>Dieser Bereich ist ausschließlich für freigeschaltete Mitarbeitende zugänglich.</p>
        <div>
          <Link className="button primary" href="/konto/anmelden">
            Anmelden
          </Link>
          <Link className="button secondary" href="/">
            Zum Shop
          </Link>
        </div>
      </main>
    );
  }
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <Link className="admin-brand" href="/admin" aria-label="BNL Administration">
          <span>BNL</span>
          <b>ADMIN</b>
        </Link>
        <p className="admin-nav-label">Arbeitsbereich</p>
        <AdminNavigation />
        <div className="admin-nav-footer">
          <Link href="/">
            <Store aria-hidden="true" /> Zum Shop <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
