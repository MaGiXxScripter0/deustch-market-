import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSecurityForms } from "@/components/account-security-forms";
import { AccountDashboardShell } from "@/components/account-dashboard-shell";
import { getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Sicherheit | ${siteConfig.name}` };

export default async function AccountSecurityPage() {
  const auth = await getCurrentProfile();
  if (!auth) redirect("/konto/anmelden");
  return (
    <AccountDashboardShell isAdmin={auth.profile?.role === "admin"}>
      <p className="breadcrumbs">
        <Link href="/konto">Mein Konto</Link> / Sicherheit
      </p>
      <div className="page-hero compact">
        <p className="kicker">KONTO SICHERN</p>
        <h1>Sicherheit.</h1>
        <p>Verwalten Sie E-Mail-Adresse, Bestätigung und Passwort an einem Ort.</p>
      </div>
      <AccountSecurityForms
        currentEmail={auth.user.email ?? ""}
        emailConfirmedAt={auth.user.email_confirmed_at ?? null}
        pendingEmail={auth.user.new_email ?? null}
      />
    </AccountDashboardShell>
  );
}
