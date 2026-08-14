import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LogOut, PackageSearch, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions";
import { getCurrentProfile } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mein Konto | Demo Baustoffmarkt" };
export default async function AccountPage() {
  const auth = await getCurrentProfile();
  if (!auth)
    return (
      <main className="shell page-main">
        <div className="account-guest">
          <UserRound size={42} />
          <p className="kicker">MEIN KONTO</p>
          <h1>Alles für Ihr Projekt an einem Ort.</h1>
          <p>Melden Sie sich an, um Anfragen, Kontaktdaten und Bearbeitungsstände einzusehen.</p>
          <div>
            <Link className="button primary" href="/konto/anmelden">
              Anmelden
            </Link>
            <Link className="button secondary" href="/konto/registrieren">
              Konto erstellen
            </Link>
          </div>
        </div>
      </main>
    );
  return (
    <main className="shell page-main">
      <div className="account-head">
        <div>
          <p className="kicker">MEIN KONTO</p>
          <h1>Guten Tag{auth.profile?.full_name ? `, ${auth.profile.full_name}` : ""}.</h1>
          <p>{auth.user.email}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit">
            <LogOut size={16} /> Abmelden
          </button>
        </form>
      </div>
      <div className="account-grid">
        <Link href="/konto/anfragen">
          <FileText />
          <span>
            <b>Meine Anfragen</b>
            <small>Bearbeitungsstand und Positionen</small>
          </span>
        </Link>
        <Link href="/sortiment">
          <PackageSearch />
          <span>
            <b>Sortiment</b>
            <small>Neue Materialien entdecken</small>
          </span>
        </Link>
        {auth.profile?.role === "admin" && (
          <Link href="/admin">
            <UserRound />
            <span>
              <b>Administration</b>
              <small>Katalog und Anfragen verwalten</small>
            </span>
          </Link>
        )}
      </div>
    </main>
  );
}
