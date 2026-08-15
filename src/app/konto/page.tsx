import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LogOut, PackageSearch, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Mein Konto | ${siteConfig.name}` };
export default async function AccountPage() {
  const auth = await getCurrentProfile();
  if (!auth)
    return (
      <main className="shell page-main">
        <div className="account-guest">
          <UserRound size={42} />
          <p className="kicker">MEIN KONTO</p>
          <h1>Alles für Ihr Projekt an einem Ort.</h1>
          <p>
            Melden Sie sich an, um Bestellungen, Kontaktdaten und Bearbeitungsstände einzusehen.
          </p>
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
            <b>Meine Bestellungen</b>
            <small>Abholstatus und Positionen</small>
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
              <small>Katalog und Bestellungen verwalten</small>
            </span>
          </Link>
        )}
      </div>
      <ProfileForm fullName={auth.profile?.full_name ?? ""} phone={auth.profile?.phone ?? ""} />
    </main>
  );
}
