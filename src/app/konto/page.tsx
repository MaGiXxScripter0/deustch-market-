import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileText, LogOut, PackageSearch, UserRound } from "lucide-react";
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
  const fullName = auth.profile?.full_name?.trim() || "";
  return (
    <main className="shell page-main">
      <section className="account-head" aria-labelledby="account-heading">
        <div>
          <p className="kicker">MEIN KONTO</p>
          <div className="account-title-row">
            <h1 id="account-heading">Guten Tag{fullName ? `, ${fullName}` : ""}.</h1>
            <span className="account-status">Angemeldet</span>
          </div>
          <p>{auth.user.email}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit">
            <LogOut size={16} aria-hidden="true" /> Abmelden
          </button>
        </form>
      </section>
      <nav className="account-actions" aria-label="Schnellzugriff">
        <Link className="account-action-card" href="/konto/anfragen">
          <FileText aria-hidden="true" />
          <span>
            <b>Meine Bestellungen</b>
            <small>Abholstatus und Positionen</small>
          </span>
          <ArrowUpRight aria-hidden="true" />
        </Link>
        <Link className="account-action-card" href="/sortiment">
          <PackageSearch aria-hidden="true" />
          <span>
            <b>Sortiment</b>
            <small>Neue Materialien entdecken</small>
          </span>
          <ArrowUpRight aria-hidden="true" />
        </Link>
        {auth.profile?.role === "admin" && (
          <Link className="account-action-card" href="/admin">
            <UserRound aria-hidden="true" />
            <span>
              <b>Administration</b>
              <small>Katalog und Bestellungen verwalten</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        )}
      </nav>
      <ProfileForm fullName={fullName} phone={auth.profile?.phone ?? ""} />
    </main>
  );
}
