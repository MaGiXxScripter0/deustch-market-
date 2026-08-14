import Link from "next/link";
import { Boxes, FolderTree, LayoutDashboard, MessageSquareText, UsersRound } from "lucide-react";
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
        <p>
          DEMO
          <br />
          <b>ADMIN</b>
        </p>
        <nav>
          <Link href="/admin">
            <LayoutDashboard />
            Übersicht
          </Link>
          <Link href="/admin/produkte">
            <Boxes />
            Produkte
          </Link>
          <Link href="/admin/kategorien">
            <FolderTree />
            Kategorien
          </Link>
          <Link href="/admin/anfragen">
            <MessageSquareText />
            Anfragen
          </Link>
          <Link href="/admin/kunden">
            <UsersRound />
            Kunden
          </Link>
        </nav>
        <Link href="/">← Zum Shop</Link>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
