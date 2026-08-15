import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { AccountDashboardShell } from "@/components/account-dashboard-shell";
import { getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Profil | ${siteConfig.name}` };

export default async function AccountProfilePage() {
  const auth = await getCurrentProfile();
  if (!auth) redirect("/konto/anmelden");
  return (
    <AccountDashboardShell isAdmin={auth.profile?.role === "admin"}>
      <p className="breadcrumbs">
        <Link href="/konto">Mein Konto</Link> / Profil
      </p>
      <div className="page-hero compact">
        <p className="kicker">KONTAKTDATEN</p>
        <h1>Mein Profil.</h1>
        <p>Halten Sie Ihre Kontaktdaten für Abholbestellungen aktuell.</p>
      </div>
      <section className="account-readonly-email">
        <span>E-Mail-Adresse</span>
        <strong>{auth.user.email}</strong>
        <Link href="/konto/sicherheit">E-Mail und Passwort verwalten</Link>
      </section>
      <ProfileForm
        fullName={auth.profile?.full_name?.trim() ?? ""}
        phone={auth.profile?.phone ?? ""}
      />
    </AccountDashboardShell>
  );
}
